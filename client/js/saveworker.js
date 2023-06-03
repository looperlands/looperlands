importScripts("lib/axios.min.js");
onmessage = function (e) {
    if (e.data.looperlands) {
        console.debug("saving..", e.data);
        let sessionId = e.data.sessionId;
        delete e.data.sessionId;
        axios.put(`/session/${sessionId}`, e.data).then(function (response) {
            console.debug("Response from Loopworms: ", response.status, response.text, response.data);
        }).catch(function (error) {
            console.log(error);
        });        
    }

}