interface ServerConfig {
	jwtExpiration: string;
	defaultStorageQuota: null | number;
}

const configFile = Bun.file("config.json");

export let config: ServerConfig = {
	jwtExpiration: "1w",
	defaultStorageQuota: null,
};

/**
 * Loads the configuration file.
 */
export async function loadConfig(createIfNotExist = false) {
	if (!(await configFile.exists())) {
		if (createIfNotExist) {
			configFile.write(JSON.stringify(config));
		}

		return;
	}

	config = await configFile.json();
}

export async function saveConfig() {
	configFile.write(JSON.stringify(config));
}
