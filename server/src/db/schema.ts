import {
	pgTable,
	serial,
	uuid,
	varchar,
	integer,
	boolean,
	timestamp,
	bigint,
	foreignKey,
	primaryKey,
	unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const fileLinks = pgTable(
	"file_links",
	{
		id: uuid().defaultRandom().primaryKey(),
		idFiles: integer("id_files").references(() => files.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
		createdBy: integer("created_by").references(() => users.id, {
			onDelete: "cascade",
		}),
		createdAt: timestamp("created_at", { withTimezone: true }).default(
			sql`CURRENT_TIMESTAMP`,
		),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		password: varchar({ length: 255 }),
		downloadLimit: integer("download_limit"),
		downloadCount: integer("download_count").default(0).notNull(),
	},
	(table) => [unique("file_links_uq").on(table.idFiles)],
);

export const files = pgTable(
	"files",
	{
		id: serial().primaryKey(),
		filename: varchar({ length: 255 }).notNull(),
		s3Path: varchar("s3_path", { length: 1024 }).notNull(),
		isFolder: boolean("is_folder").default(false).notNull(),
		parentFolder: integer("parent_folder"),
		created: timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updated: timestamp({ withTimezone: true }).default(
			sql`CURRENT_TIMESTAMP`,
		),
		trashed: boolean().default(false).notNull(),
		idUsers: integer("id_users").references(() => users.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
		virtualPath: varchar("virtual_path", { length: 1024 })
			.default("")
			.notNull(),
        sha256: varchar("sha256", { length: 64 })
	},
	(table) => [
		foreignKey({
			columns: [table.parentFolder],
			foreignColumns: [table.id],
			name: "parent_fk",
		}).onDelete("cascade"),
	],
);

export const users = pgTable(
	"users",
	{
		id: serial().primaryKey(),
		username: varchar({ length: 255 }).notNull(),
		email: varchar({ length: 255 }).notNull(),
		password: varchar({ length: 255 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		lastLogin: timestamp("last_login", { withTimezone: true }),
		storageQuota: bigint("storage_quota", { mode: "number" }),
		storageUsed: bigint("storage_used", { mode: "number" })
			.default(0)
			.notNull(),
	},
	(table) => [unique("users_info").on(table.username, table.email)],
);
