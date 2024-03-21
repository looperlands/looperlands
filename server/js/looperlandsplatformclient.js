const axios = require('axios');
class LooperLandsPlatformClient {
    constructor(apiKey, baseUrl) {
        this.platformDefined = apiKey && baseUrl;
        if (!this.platformDefined) {
            console.warn("Platform API KEY and baseUrl not defined");
            return;
        }
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey
            }
        });

        let self = this;
        const takeOffLine = async (code) => {
            await self.takeGameServerOffline();
            process.exit(0);
        }
        process.on('exit', takeOffLine);
        process.on('SIGTERM', takeOffLine);
        process.on('SIGINT', takeOffLine);
    }

    async createOrUpdateGameServer(hostname, port, name) {
        if (!this.platformDefined) return;

        try {
            const url = `/api/gameserver/${encodeURIComponent(hostname)}`;
            const gameServerData = { name, port };
            const response = await this.client.put(url, gameServerData);
            this.hostname = hostname;
            console.log("Registered gameserver hostname with platform:", hostname);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async takeGameServerOffline() {
        if (!this.platformDefined) return;

        try {
            const url = `/api/gameserver/${encodeURIComponent(this.hostname)}/offline`;
            const response = await this.client.post(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getSpinIndex() {
        if (!this.platformDefined) return;
        try {
            const url = "/api/maps/cornsino/spin";
            const response = await this.client.get(url);
            console.log('response: ', response);
            return response.data.spin;
        } catch (error) {
            this.handleError(error);
        }
    }

    handleError(error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            throw new Error(`HTTP error! status: ${error.response.status}`);
        } else if (error.request) {
            // The request was made but no response was received
            throw new Error('No response received');
        } else {
            // Something happened in setting up the request that triggered an Error
            throw error;
        }
    }

}

exports.LooperLandsPlatformClient = LooperLandsPlatformClient;