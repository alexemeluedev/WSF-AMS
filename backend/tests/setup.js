import {
  connectTestDatabase,
  clearTestDatabase,
  closeTestDatabase,
} from "./helpers/database.js";

beforeAll(async () => {
  await connectTestDatabase();
}, 60000);

afterEach(async () => {
  await clearTestDatabase();
}, 30000);

afterAll(async () => {
  await closeTestDatabase();
}, 30000);
