importScripts("lib/axios.min.js");
onmessage = function (e) {
    if (e.data.loopquest) {
        console.debug("saving..", e.data);
        axios.put(`/session/${e.data.sessionId}`, e.data).then(function (response) {
            console.debug("Response from Loopworms: ", response.status, response.text, response.data);
        }).catch(function (error) {
            console.log(error);
        });        
    }

}