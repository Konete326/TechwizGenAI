import { User } from "../models/User.js";

export const seedAdmin = async () => {
  try {
    let admin = await User.findOne({ email: "admin@gmail.com" });
    if (!admin) {
      await User.create({
        name: "Sameer",
        email: "admin@gmail.com",
        password: "admin123",
        role: "admin"
      });
    } else if (admin.name !== "Sameer") {
      admin.name = "Sameer";
      await admin.save({ validateModifiedOnly: true });
    }
  } catch (error) {
    console.error("Admin seeding error:", error.message);
  }
};

export default seedAdmin;
