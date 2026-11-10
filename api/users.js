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
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured in Vercel.');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountValue);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid JSON.');
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || serviceAccount.project_id !== projectId) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT must belong to FIREBASE_PROJECT_ID.'
    );
  }

  return getAuth(
    initializeApp(
      {
        credential: cert(serviceAccount),
        projectId,
      },
      'project-tracker-admin'
    )
  );
};

const toAppUser = (user) => {
  const username = user.customClaims?.username;
  if (!username) return null;
  return {
    id: user.uid,
    username,
    role: ['Admin', 'Editor', 'Viewer'].includes(user.customClaims.role)
      ? user.customClaims.role
      : 'Viewer',
    displayName: user.displayName || username,
    password: '',
    failedAttempts: 0,
    isLocked: user.disabled,
    createdAt: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).getTime()
      : Date.now(),
  };
};

const listManagedUsers = async (auth) => {
  const users = [];
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(...result.users.map(toAppUser).filter(Boolean));
    pageToken = result.pageToken;
  } while (pageToken);
  return users;
};

const hasAdmin = async (auth) => {
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    if (result.users.some((user) => user.customClaims?.role === 'Admin')) {
      return true;
    }
    pageToken = result.pageToken;
  } while (pageToken);
  return false;
};

const validateUser = (input, { requirePassword = true } = {}) => {
  const username =
    typeof input?.username === 'string' ? input.username.trim() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  const role = input?.role;
  const displayName =
    typeof input?.displayName === 'string' && input.displayName.trim()
      ? input.displayName.trim()
      : username;

  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(username)) {
    throw new Error(
      'Username must be 1 to 64 characters using letters, numbers, dots, underscores, or hyphens.'
    );
  }
  if (requirePassword && password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (!['Admin', 'Editor', 'Viewer'].includes(role)) {
    throw new Error('Choose a valid user role.');
  }
  return { username, password, role, displayName };
};

const createManagedUser = async (auth, input) => {
  const { username, password, role, displayName } = validateUser(input);
  const user = await auth.createUser({
    email: usernameEmail(username),
    password,
    displayName,
  });
  await auth.setCustomUserClaims(user.uid, { username, role });
  return toAppUser(await auth.getUser(user.uid));
};

const requireAdmin = async (auth, request) => {
  const authorization = request.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  if (!token) {
    const error = new Error('Sign in with your username and password first.');
    error.status = 401;
    throw error;
  }
  const decodedToken = await auth.verifyIdToken(token);
  if (decodedToken.role !== 'Admin') {
    const error = new Error('Admin access is required.');
    error.status = 403;
    throw error;
  }
  return decodedToken;
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const auth = getAdminAuth();
    const body = request.body || {};
    const action = body.action;

    if (action === 'bootstrapAdmin') {
      const expectedSecret = process.env.FIREBASE_BOOTSTRAP_SECRET;
      if (!expectedSecret) {
        return response.status(403).json({
          error:
            'Initial admin setup is disabled. Configure FIREBASE_BOOTSTRAP_SECRET in Vercel.',
        });
      }
      if (
        typeof body.setupSecret !== 'string' ||
        body.setupSecret !== expectedSecret
      ) {
        return response.status(403).json({ error: 'Invalid setup code.' });
      }
      if (await hasAdmin(auth)) {
        return response
          .status(409)
          .json({ error: 'An Admin account already exists.' });
      }
      const input = validateUser(
        { ...body.user, role: 'Admin' },
        { requirePassword: true }
      );
      const user = await auth.createUser({
        email: usernameEmail(input.username),
        password: input.password,
        displayName: input.displayName,
      });
      await auth.setCustomUserClaims(user.uid, {
        username: input.username,
        role: 'Admin',
      });
      const customToken = await auth.createCustomToken(user.uid);
      return response.status(201).json({ customToken });
    }

    const decodedToken = await requireAdmin(auth, request);

    if (action === 'listUsers') {
      return response.status(200).json({ users: await listManagedUsers(auth) });
    }

    if (action === 'syncAccounts') {
      if (!Array.isArray(body.users) || body.users.length > 500) {
        return response.status(400).json({ error: 'Invalid user list.' });
      }
      for (const input of body.users) {
        const valid = validateUser(input, { requirePassword: false });
        const isCurrentAdmin =
          valid.username.toLowerCase() ===
          String(decodedToken.username || '').toLowerCase();
        if (
          valid.username.toLowerCase() === 'waranyac' &&
          !isCurrentAdmin
        ) {
          continue;
        }
        if (isCurrentAdmin) {
          valid.role = 'Admin';
        } else if (valid.role === 'Admin') {
          valid.role = 'Editor';
        }
        const email = usernameEmail(valid.username);
        let existing;
        try {
          existing = await auth.getUserByEmail(email);
        } catch (error) {
          if (error.code !== 'auth/user-not-found') throw error;
        }

        if (existing) {
          await auth.updateUser(existing.uid, {
            displayName: valid.displayName,
            disabled: Boolean(input.isLocked),
          });
          await auth.setCustomUserClaims(existing.uid, {
            ...existing.customClaims,
            username: valid.username,
            role: valid.role,
          });
        } else if (valid.password.length >= 6) {
          await createManagedUser(auth, valid);
        } else {
          throw new Error(
            `A password is required to migrate "${valid.username}".`
          );
        }
      }
      return response.status(200).json({ users: await listManagedUsers(auth) });
    }

    const userInput = body.user || {};
    if (action === 'createUser') {
      const user = await createManagedUser(auth, userInput);
      return response.status(201).json({ user });
    }

    if (action === 'updateUser') {
      const { id, username, role, displayName } = userInput;
      if (
        typeof id !== 'string' ||
        !id ||
        typeof username !== 'string' ||
        !username.trim() ||
        !['Admin', 'Editor', 'Viewer'].includes(role)
      ) {
        return response.status(400).json({ error: 'Invalid user update.' });
      }
      if (id === decodedToken.uid && role !== 'Admin') {
        return response
          .status(400)
          .json({ error: 'You cannot remove your own Admin role.' });
      }
      const user = await auth.updateUser(id, {
        displayName: displayName || username,
      });
      await auth.setCustomUserClaims(id, {
        ...user.customClaims,
        username: username.trim(),
        role,
      });
      return response
        .status(200)
        .json({ user: toAppUser(await auth.getUser(id)) });
    }

    if (action === 'resetPassword') {
      if (
        typeof userInput.id !== 'string' ||
        typeof userInput.password !== 'string' ||
        userInput.password.length < 6
      ) {
        return response
          .status(400)
          .json({ error: 'Password must be at least 6 characters.' });
      }
      await auth.updateUser(userInput.id, {
        password: userInput.password,
        disabled: false,
      });
      return response.status(200).json({ ok: true });
    }

    if (action === 'disableUser' || action === 'enableUser') {
      if (
        typeof userInput.id !== 'string' ||
        !userInput.id ||
        userInput.id === decodedToken.uid
      ) {
        return response.status(400).json({ error: 'Invalid user.' });
      }
      await auth.updateUser(userInput.id, {
        disabled: action === 'disableUser',
      });
      return response.status(200).json({ ok: true });
    }

    return response.status(400).json({ error: 'Unknown action.' });
  } catch (error) {
    console.error('Firebase user administration request failed:', error);
    const status =
      typeof error?.status === 'number'
        ? error.status
        : error?.code === 'auth/email-already-exists'
          ? 409
          : error?.code === 'auth/user-not-found'
            ? 404
            : 500;
    return response.status(status).json({
      error:
        status === 500
          ? 'Firebase account service failed. Check the Vercel Runtime Logs.'
          : error instanceof Error
            ? error.message
            : 'Firebase user operation failed.',
    });
  }
}
