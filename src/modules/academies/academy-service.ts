import mongoose from "mongoose";
import { Academy, User } from "@/models";
import { hashPassword } from "@/lib/auth/password";
import { slugify } from "@/lib/utils";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface RegisterAcademyInput {
  academyName: string;
  description?: string;
  city: string;
  state: string;
  country: string;
  address?: string;
  contactEmail: string;
  contactPhone: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
}

export async function registerAcademy(input: RegisterAcademyInput) {
  const normalizedOwnerEmail = input.ownerEmail.trim().toLowerCase();
  const normalizedContactEmail = input.contactEmail.trim().toLowerCase();

  // Check if owner email already exists
  const existingUser = await User.findOne({ email: normalizedOwnerEmail });
  if (existingUser) {
    throw new ConflictError("An account with this owner email address already exists.");
  }

  // Generate unique slug
  let slug = slugify(input.academyName);
  const existingAcademySlug = await Academy.findOne({ slug });
  if (existingAcademySlug) {
    slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
  }

  const hashedPassword = await hashPassword(input.password);

  const ownerUserId = new mongoose.Types.ObjectId();
  const academyId = new mongoose.Types.ObjectId();

  // Create owner user
  const ownerUser = await User.create({
    _id: ownerUserId,
    academyId: academyId,
    role: "ACADEMY_OWNER",
    name: input.ownerName.trim(),
    email: normalizedOwnerEmail,
    passwordHash: hashedPassword,
    status: "ACTIVE",
    metadata: {
      phone: input.contactPhone.trim(),
    },
  });

  // Create academy
  const academy = await Academy.create({
    _id: academyId,
    name: input.academyName.trim(),
    slug,
    description: input.description || "",
    location: {
      address: input.address || "",
      city: input.city.trim(),
      state: input.state.trim(),
      country: input.country.trim(),
    },
    contactEmail: normalizedContactEmail,
    contactPhone: input.contactPhone.trim(),
    ownerId: ownerUserId,
    status: "ACTIVE",
  });

  return {
    academy: {
      id: academy._id.toString(),
      name: academy.name,
      slug: academy.slug,
      status: academy.status,
    },
    owner: {
      id: ownerUser._id.toString(),
      name: ownerUser.name,
      email: ownerUser.email,
      role: ownerUser.role,
    },
  };
}

export async function getAcademyById(academyId: string) {
  const academy = await Academy.findById(academyId).populate("ownerId", "name email");
  if (!academy) {
    throw new NotFoundError("Academy not found");
  }
  return academy;
}
