import { HydratedDocument, Types } from "mongoose";

export type TCategoryStatus = "show" | "hide";

export type TCategory = {
  name: string;
  description?: string;
  slug: string;
  // Ref to another Category; null marks a root of the tree.
  parentId: Types.ObjectId | null;
  parentName?: string;
  icon?: string;
  status: TCategoryStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TCategoryDocument = HydratedDocument<TCategory>;

export type TCreateCategory = {
  name: string;
  description?: string;
  slug?: string;
  parentId?: string | null;
  parentName?: string;
  icon?: string;
  status?: TCategoryStatus;
};

export type TUpdateCategory = Partial<TCreateCategory>;

/** What the tree endpoints return: a category plus its nested children. */
export type TCategoryNode = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  slug: string;
  parentId: Types.ObjectId | null;
  parentName?: string;
  icon?: string;
  status: TCategoryStatus;
  children: TCategoryNode[];
};

/**
 * What every bulk service returns. Rows are reported individually rather than the
 * whole batch failing on one bad entry — and this shape is what lets a BullMQ worker
 * call the same service later without the signature changing.
 */
export type TBulkResult = {
  succeeded: number;
  failed: { index: number; identifier?: string; error: string }[];
};
