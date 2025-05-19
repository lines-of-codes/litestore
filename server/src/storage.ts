import {
	CreateMultipartUploadCommand,
	S3Client,
	UploadPartCommand,
} from "@aws-sdk/client-s3";
import { bytesToMebibytes, mebibyte } from "./util/unitSize";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as path from "node:path";

interface FileLocation {
	/**
	 * Owner of the file
	 */
	owner: number;

	/**
	 * Path of the file in the scope of the file owner
	 */
	path: string;
}

interface UploadInfo {
	path: string;
	/**
	 * The file size in bytes
	 */
	size: number;
}

interface UploadInstructions {
	links: string[];
	sizes: number[];
}

abstract class Storage {
	/**
	 * List the contents of a directory
	 * @param dir Location of the directory
	 */
	abstract list(dir: FileLocation): Promise<string[]>;

	/**
	 * Creates a directory. This does NOT handle creating a
	 * metadata entry within the database.
	 * @param dir Location of the directory
	 */
	abstract createFolder(dir: FileLocation): Promise<void>;

	/**
	 * Gets the download link. This link may expire.
	 * @param file Information of a file
	 */
	abstract downloadLink(file: FileLocation | string): string;

	/**
	 * Will return one upload link for simple (<16MiB)
	 * uploads, but multiple multipart upload links
	 * for uploads larger than that.
	 * @param file File information
	 */
	abstract uploadLink(file: UploadInfo): Promise<UploadInstructions>;

	abstract deleteFile(file: FileLocation): Promise<void>;
}

/**
 * Default part size in mebibytes
 */
const defaultPartSize = 16;
/**
 * Max amount of parts
 * (But ideally it should never reach this amount)
 */
const maxParts = 10_000;

export class S3Driver extends Storage {
	s3: Bun.S3Client;
	s3_aws: S3Client;

	constructor() {
		super();
		this.s3 = new Bun.S3Client({
			accessKeyId: process.env.S3_ACCESS_KEY_ID,
			secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
			region: process.env.S3_REGION,
			endpoint: process.env.S3_ENDPOINT,
			bucket: process.env.S3_BUCKET,
		});
		this.s3_aws = new S3Client({
			endpoint: process.env.S3_ENDPOINT,
			forcePathStyle: true,
			credentials: {
				accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
				secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
			},
		});
	}

	getPath(file: FileLocation): string {
		return path.join("users", file.owner.toString(), file.path);
	}

	async list(dir: FileLocation): Promise<string[]> {
		const objects = await this.s3.list({
			prefix: this.getPath(dir),
			maxKeys: 500,
		});

		if (objects.contents === undefined) return [];

		return objects.contents.map((v) => v.key);
	}

	downloadLink(file: string): string {
		return this.s3.presign(file);
	}

	async uploadLink(file: UploadInfo): Promise<UploadInstructions> {
		const mib = bytesToMebibytes(file.size);
		const filePath = file.path;

		// File can fit in a single part
		if (mib < defaultPartSize) {
			return {
				links: [
					this.s3.presign(filePath, {
						method: "PUT",
					}),
				],
				sizes: [file.size],
			};
		}

		const uploadCommand = new CreateMultipartUploadCommand({
			Bucket: process.env.S3_BUCKET,
			Key: filePath,
		});

		const startUploadResponse = await this.s3_aws.send(uploadCommand);
		const uploadId = startUploadResponse.UploadId;

		const partSize = Math.max(
			defaultPartSize * mebibyte,
			file.size / maxParts
		);
		const partCount = Math.ceil(file.size / partSize);

		let fileSize = file.size;
		let partSizes = [];

		while (fileSize >= partSize) {
			fileSize -= partSize;
			partSizes.push(partSize);
		}

		if (fileSize > 0) {
			partSizes.push(partSize);
		}

		let presignedUrls: string[] = [];

		for (let i = 1; i < partCount; i++) {
			const presignedUrl = await getSignedUrl(
				this.s3_aws,
				new UploadPartCommand({
					Bucket: process.env.S3_BUCKET,
					Key: filePath,
					UploadId: uploadId,
					PartNumber: i,
				})
			);

			presignedUrls.push(presignedUrl);
		}

		return {
			links: presignedUrls,
			sizes: partSizes,
		};
	}

	async createFolder(dir: FileLocation): Promise<void> {
		this.s3.write(this.getPath(dir), "");
	}

	deleteFile(file: FileLocation) {
		return this.s3.delete(this.getPath(file));
	}
}

export let storage: Storage = new S3Driver();
