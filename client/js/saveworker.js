importScripts("lib/axios.min.js");
onmessage = function (e) {
    if (e.data.loopquest) {
        console.debug("saving..", e.data);
        axios.post(`/wallets/${e.data.walletId}/nfts/${e.data.nftId}`, e.data).then(function (response) {
            console.debug("Response from Loopworms: ", response.status, response.text, response.data);
        }).catch(function (error) {
            console.log(error);
        });        
    }

}