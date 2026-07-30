import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Admin, AdminSchema } from '../auth/admin/admin.schema';

async function main() {
  const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/roova';
  await mongoose.connect(mongoUri);

  const AdminModel = mongoose.model(Admin.name, AdminSchema);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@roova.xyz';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const existing = await AdminModel.findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await AdminModel.create({ name: 'Roova Admin', email, passwordHash });

  console.log(`Seeded admin account: ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
