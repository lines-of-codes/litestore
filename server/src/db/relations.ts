import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
	files: {
		usersViaFileLinks: r.many.users({
			from: r.files.id.through(r.fileLinks.idFiles),
			to: r.users.id.through(r.fileLinks.createdBy),
			alias: "files_id_users_id_via_fileLinks"
		}),
		usersViaFiles: r.many.users({
			from: r.files.id.through(r.files.parentFolder),
			to: r.users.id.through(r.files.idUsers),
			alias: "files_id_users_id_via_files"
		}),
	},
	users: {
		filesViaFileLinks: r.many.files({
			alias: "files_id_users_id_via_fileLinks"
		}),
		filesViaFiles: r.many.files({
			alias: "files_id_users_id_via_files"
		}),
	},
}))