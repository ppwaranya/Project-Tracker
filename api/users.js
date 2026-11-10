import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const usernameEmail = (username) =>
  `u-${Buffer.from(username.trim().toLowerCase(), 'utf8').toString('hex')}@project-tracker.firebaseapp.com`;

const getAdminAuth = () => {
  const existingApp = getApps().find(
    (app) => app.name === 'project-tracker-admin'
  );
  if (existingApp) return getAuth(existingApp);

  const serviceAccountValue = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountValue) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured.');
  }

  const serviceAccount = JSON.parse(serviceAccountValue);
  const expectedProjectId = process.env.FIREBASE_PROJECT_ID;
  if (!expectedProjectId || serviceAccount.project_id !== expectedProjectId) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT must belong to FIREBASE_PROJECT_ID.'
    );
  }
  const app = initializeApp(
    {
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    },
    'project-tracker-admin'
  );
  return getAuth(app);
};

const isBootstrapAdmin = (decodedToken) => {
  const allowedEmail = process.env.FIREBASE_BOOTSTRAP_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();
  return Boolean(
    allowedEmail &&
      decodedToken.email?.toLowerCase() === allowedEmail &&
      decodedToken.firebase?.sign_in_provider === 'google.com'
  );
};

const setUserRole = async (auth, userRecord, username, role) => {
  await auth.setCustomUserClaims(userRecord.uid, {
    ...userRecord.customClaims,
    username,
    role,
  });
  return {
    id: userRecord.uid,
    username,
    role,
    displayName: userRecord.displayName || username,
    password: '',
    failedAttempts: 0,
    isLocked: false,
    createdAt: userRecord.metadata.creationTime
      ? new Date(userRecord.metadata.creationTime).getTime()
      : Date.now(),
  };
};

const listManagedUsers = async (auth) => {
  const users = [];
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(
      ...result.users
        .filter((user) => user.customClaims?.username)
        .map((user) => ({
          id: user.uid,
          username: user.customClaims.username,
          role: user.customClaims.role || 'Viewer',
          displayName: user.displayName || user.customClaims.username,
          password: '',
          failedAttempts: 0,
          isLocked: user.disabled,
          createdAt: user.metadata.creationTime
            ? new Date(user.metadata.creationTime).getTime()
            : Date.now(),
        }))
    );
    pageToken = result.pageToken;
  } while (pageToken);
  return users;
};

const provisionUser = async (auth, input, updateExistingPassword = true) => {
  const username =
    typeof input.username === 'string' ? input.username.trim() : '';
  const role = input.role;
  const displayName =
    typeof input.displayName === 'string' && input.displayName.trim()
      ? input.displayName.trim()
      : username;
  const password = typeof input.password === 'string' ? input.password : '';

  if (!username || username.length > 64) {
    throw new Error('Username must contain 1 to 64 characters.');
  }
  if (!['Admin', 'Editor', 'Viewer'].includes(role)) {
    throw new Error(`Invalid role for user "${username}".`);
  }

  const email = usernameEmail(username);
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    const updates = {
      displayName,
      disabled: updateExistingPassword ? false : userRecord.disabled,
    };
    if (password && updateExistingPassword) {
      if (password.length < 6) {
        throw new Error(`Password for "${username}" must be at least 6 characters.`);
      }
      updates.password = password;
    }
    userRecord = await auth.updateUser(userRecord.uid, updates);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    if (password.length < 6) {
      throw new Error(
        `A password of at least 6 characters is required to create "${username}".`
      );
    }
    userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });
  }

  return setUserRole(auth, userRecord, username, role);
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const auth = getAdminAuth();
    const authorization = request.headers.authorization || '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : '';
    if (!token) {
      return response.status(401).json({ error: 'Sign in is required.' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const bootstrapAdmin = isBootstrapAdmin(decodedToken);
    const action = request.body?.action;
    const body = request.body || {};

    if (action === 'bootstrapAdmin') {
      if (!bootstrapAdmin) {
        return response.status(403).json({ error: 'Not authorized.' });
      }
      const input = body.user || {};
      if (typeof input.username !== 'string' || typeof input.password !== 'string') {
        return response.status(400).json({
          error: 'Admin username and password are required.',
        });
      }
      const user = await provisionUser(
        auth,
        {
          username: input.username,
          password: input.password,
          displayName: input.displayName,
          role: 'Admin',
        },
        true
      );
      const bootstrapUser = await auth.getUser(decodedToken.uid);
      await auth.setCustomUserClaims(decodedToken.uid, {
        ...bootstrapUser.customClaims,
        role: 'Admin',
      });
      return response.status(200).json({ user });
    }

    const isAdmin = decodedToken.role === 'Admin' || bootstrapAdmin;
    if (!isAdmin) {
      return response.status(403).json({ error: 'Admin access is required.' });
    }

    if (action === 'syncAccounts') {
      if (!Array.isArray(body.users) || body.users.length > 500) {
        return response.status(400).json({ error: 'Invalid user list.' });
      }
      for (const user of body.users) {
        await provisionUser(auth, user, false);
      }
      return response.status(200).json({ users: await listManagedUsers(auth) });
    }

    if (action === 'createUser') {
      const username = body.user?.username;
      if (typeof username !== 'string' || !username.trim()) {
        return response.status(400).json({ error: 'Username is required.' });
      }
      try {
        await auth.getUserByEmail(usernameEmail(username));
        return response.status(409).json({ error: 'Username already exists.' });
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }
      const user = await provisionUser(auth, body.user || {});
      return response.status(201).json({ user });
    }

    if (action === 'updateUser') {
      const { id, username, role, displayName } = body.user || {};
      if (!id || !username || !['Admin', 'Editor', 'Viewer'].includes(role)) {
        return response.status(400).json({ error: 'Invalid user update.' });
      }
      const userRecord = await auth.updateUser(id, {
        displayName: displayName || username,
      });
      const user = await setUserRole(auth, userRecord, username, role);
      return response.status(200).json({ user });
    }

    if (action === 'resetPassword') {
      const { id, password } = body.user || {};
      if (!id || typeof password !== 'string' || password.length < 6) {
        return response
          .status(400)
          .json({ error: 'Password must be at least 6 characters.' });
      }
      await auth.updateUser(id, { password });
      return response.status(200).json({ ok: true });
    }

    if (action === 'disableUser') {
      const { id } = body.user || {};
      if (!id || id === decodedToken.uid) {
        return response.status(400).json({ error: 'Invalid user to disable.' });
      }
      await auth.updateUser(id, { disabled: true });
      return response.status(200).json({ ok: true });
    }

    if (action === 'enableUser') {
      const { id } = body.user || {};
      if (!id) {
        return response.status(400).json({ error: 'Invalid user to enable.' });
      }
      await auth.updateUser(id, { disabled: false });
      return response.status(200).json({ ok: true });
    }

    return response.status(400).json({ error: 'Unknown action.' });
  } catch (error) {
    console.error('Firebase user administration request failed:', error);
    const message =
      error instanceof Error ? error.message : 'Firebase user operation failed.';
    return response.status(500).json({ error: message });
  }
}
