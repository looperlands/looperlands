class DynamicNFTController {
    constructor(cache, platformClient, Types) {
        this.cache = cache;
        this.platformClient = platformClient;
        this.Types = Types;
    }

    // Method to get NFT data based on session and NFT ID
    getNFTData = async (req, res) => {
        const sessionId = req.params.sessionId;
        const sessionData = this.cache.get(sessionId);
        if (sessionData === undefined) {
            res.status(404).json({
                status: false,
                error: "No session with id " + sessionId + " found",
                user: null
            });
            return;
        }
        const nftId = req.params.nftId;
        const nftData = await this.platformClient.getNFTDataForGame(nftId);
        this.Types.addDynamicNFT(nftData);
        res.status(200).send(nftData);
    }

    // Method to get NFT data based on session and entity ID
    getNFTDataByKindId = async (req, res) => {
        const sessionId = req.params.sessionId;
        const sessionData = this.cache.get(sessionId);
        if (sessionData === undefined) {
            res.status(404).json({
                status: false,
                error: "No session with id " + sessionId + " found",
                user: null
            });
            return;
        }
        const kindId = req.params.kindId;
        const kind = this.Types.getKindAsString(kindId);
        const nftId = kind.replace("NFT_", "0x");
        const nftData = await this.platformClient.getNFTDataForGame(nftId);
        res.status(200).send(nftData);
    }
}

exports.DynamicNFTController = DynamicNFTController;
