import bcrypt from 'bcryptjs';
import { conflict, unauthenticated } from '../lib/errors';
import { UserModel, type UserDoc } from '../models';
import type { ApiUser } from '../types/api';
import type { LoginBody, RegisterBody } from '../validators/schemas';
import { toUser } from './mappers';

export const BCRYPT_COST = 12;
const BAD_CREDENTIALS = 'Invalid email or password';

// Compared against when the email is unknown so both failure paths take the same time.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash('hireready-timing-equaliser', BCRYPT_COST));

export async function register(body: RegisterBody): Promise<ApiUser> {
  if (await UserModel.exists({ email: body.email })) throw conflict('An account with this email already exists');
  const passwordHash = await bcrypt.hash(body.password, BCRYPT_COST);
  // a concurrent registration with the same email hits the unique index → 11000 → 409 in the error handler
  const user = await UserModel.create({ name: body.name, email: body.email, passwordHash });
  return toUser(user);
}

export async function login(body: LoginBody): Promise<ApiUser> {
  const user = await UserModel.findOne({ email: body.email }).select('+passwordHash').lean<UserDoc>();
  // unknown email, or a Google-only account without a password: same message and timing as a wrong password
  if (!user?.passwordHash) {
    await bcrypt.compare(body.password, await getDummyHash());
    throw unauthenticated(BAD_CREDENTIALS);
  }
  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) throw unauthenticated(BAD_CREDENTIALS);
  return toUser(user);
}
