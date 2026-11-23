import 'server-only';
import bcrypt from 'bcryptjs';

/** Initial password for accounts the system creates (new students/faculty). Override with DEFAULT_USER_PASSWORD. */
export const initialPasswordHash = () => bcrypt.hashSync(process.env.DEFAULT_USER_PASSWORD || 'password', 10);
