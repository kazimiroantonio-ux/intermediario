import type { Listing, User } from "@prisma/client";

export type ListingOwner = {
  id: string;
  name: string;
  isVerified?: boolean;
  companyName?: string | null;
  image?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  createdAt?: Date;
};

export type SerializedListing = Omit<Listing, "price" | "attributes"> & {
  price: string;
  attributes: Record<string, string>;
  owner?: ListingOwner | null;
  images: string[];
  featured: boolean;
};

export function serializeListing(
  listing: Listing & {
    user?: ListingOwner | null;
  }
): SerializedListing {
  const { price, images = [], attributes, user, ...rest } = listing;
  const attrs: Record<string, string> =
    attributes && typeof attributes === "object"
      ? (attributes as Record<string, string>)
      : {};
  return {
    ...rest,
    price: price.toString(),
    images: Array.isArray(images) ? images : [],
    attributes: attrs,
    owner: user,
    featured: rest.isFeatured ?? false,
  };
}

export function serializeListings(
  listings: (Listing & {
    user?: ListingOwner | null;
  })[]
): SerializedListing[] {
  return listings.map(serializeListing);
}

export type { User as PrismaUser };
