// UI components:
const errorsBox = document.getElementById("errorBox");
const resultsBox = document.getElementById("resultBox");

const contractInput = document.getElementById("heliosInput")

const lockButton = document.getElementById("lockBtn");
const unlockButton = document.getElementById("unlockBtn");

const lockInput = document.getElementById("lockInput")
const unlockInput = document.getElementById("unlockInput")

const contractAddressInput = document.getElementById("contractAddressInput")
const txHashInput = document.getElementById("txHashInput")
const txHashIndexInput = document.getElementById("txHashIndexInput")

const connectButton = document.getElementById("connectButton")

async function store() {
    let contract = contractInput.value 
    let contractAddress = contractAddressInput.value
    let lockTxHash = txHashInput.value
    let lockTxIndex = txHashIndexInput.value
    localStorage.setItem("contract", contract)
    localStorage.setItem("contractAddress", contractAddress);
    localStorage.setItem("lockTx", lockTxHash);
    localStorage.setItem("lockTxIndex", lockTxIndex);
    main()
}

const generateSC=async () => {
    const Buffer = gc.utils.Buffer;                  
    const heliosCode = contractInput.value
    console.log(heliosCode)
    return Buffer.from(heliosCode).toString('hex');
}

async function main() {

    // import {gc,encodings} from '@gamechanger-finance/gc'
    const {gc,encodings}=window;
    
    // Dapp <--> GameChanger Wallet connections can use URL redirections
    let actionUrl = "";
    let resultObj = undefined;
    let error = "";

    // GameChanger Wallet is pure Web3, zero backend procesing of user data. 
    // Dapp connector links are fully processed on end-user browsers.
    const gcApiUrl = "https://beta-preprod-wallet.gamechanger.finance/api/2/run/";
    const currentUrl = window.location.href;
 
    async function updateUI() {
        error = "";
        actionUrl_lock = "";

        actionUrl_unlock = "";

        console.log(contractAddressInput.value);
        console.log(typeof(contractAddressInput.value));

        if(contractAddressInput.value !== "undefined"){
            console.log("get")
            contractAddressInput.value = localStorage.getItem("contractAddress");
        }
        
        contractAddressInput.value = localStorage.getItem("contractAddress");

        if(txHashInput.value !== "undefined"){
            console.log("get")
            txHashInput.value = localStorage.getItem("lockTx");
        } else {
            txHashInput.value = localStorage.getItem("lockTx");
        }

        txHashIndexInput.value = parseInt(localStorage.getItem("lockTxIndex"));

        // GameChanger Wallet support arbitrary data returning from script execution, encoded in a redirect URL
        // Head to http:// localhost:3000/doc/api/v2/api.html#returnURLPattern to learn ways how to customize this URL

        // lets try to capture the execution results by decoding/decompressing the return URL
        try {
            const resultRaw = (new URL(currentUrl)).searchParams.get("result");
            if (resultRaw) {
                resultObj     = await encodings.msg.decoder(resultRaw);
                //avoids current url carrying latest results all the time 
                history.pushState({}, '', window.location.pathname);
            }
        } catch (err) {
            error += `Failed to decode results.${err?.message || "unknown error"}`;
            console.error(err);
        }

        // Token lock button
        try {
            // GCScript (dapp connector code) will be packed inside this URL    
            actionUrl_lock = await buildActionUrl_lock();
        } catch (err) {
            error += `Failed to build URL.${err?.message || "unknown error"}`
            console.error(err);
        }

        //Now lets render the current application state
        if (error) {
            errorBox.innerHTML = "Error: " + error;
        }
        if (actionUrl_lock) {
            errorBox.innerHTML = "";
            lockAction = "location.href='" + actionUrl_lock + "'"
            lockButton.setAttribute("onclick", lockAction)
            lockButton.innerHTML = `<img style="height: 20px" src="lock.svg"></img> Lock`;
        } else {
            lockButton.innerHTML = "Loading...";
        }

        // Token unlock button
        try {
            // GCScript (dapp connector code) will be packed inside this URL    
            actionUrl_unlock = await buildActionUrl_unlock();
        } catch (err) {
            error += `Failed to build URL.${err?.message || "unknown error"}`
            console.error(err);
        }

        if (actionUrl_unlock) {
            errorBox.innerHTML = "";
            unlockAction = "location.href='" + actionUrl_unlock + "'"
            unlockButton.setAttribute("onclick", unlockAction)
            unlockButton.innerHTML = `<img style="height: 20px" src="unlock.svg"></img> Unlock`;
        } else {
            unlockButton.href = '#';
            unlockButton.innerHTML = "Loading...";
        }

        // Token connect button
        try {
            // GCScript (dapp connector code) will be packed inside this URL    
            actionUrl_connect = await buildActionUrl_connect();
        } catch (err) {
            error += `Failed to build URL.${err?.message || "unknown error"}`
            console.error(err);
        }

        if (actionUrl_connect) {
            errorBox.innerHTML = "";
            connectAction = "location.href='" + actionUrl_connect + "'"
            connectButton.setAttribute("onclick", connectAction)

            if (localStorage.getItem("wallet_name")) {
                connectButton.innerHTML = localStorage.getItem("wallet_name");
            } else {
                connectButton.innerHTML = `Connect`;
            }

        } else {
            connectButton.href = '#';
            connectButton.innerHTML = "Loading...";
        }


        if (resultObj) {
            resultsBox.innerHTML = JSON.stringify(resultObj, null, 2);


            if (resultObj.exports.connect) {
                console.log(resultObj.exports.connect.data.name)
                console.log(resultObj.exports.connect.data.address)

                localStorage.setItem("wallet_name", resultObj.exports.connect.data.name)
                localStorage.setItem("wallet_address", resultObj.exports.connect.data.address)
                connectButton.innerHTML = localStorage.getItem("wallet_name");
            }

            if (resultObj.exports.Lock_Demo) {
                contractAddress = resultObj.exports.Lock_Demo.contractAddress;
                localStorage.setItem("contractAddress", contractAddress);
                contractAddressInput.value = contractAddress;
                
                const lockTxHash = resultObj.exports.Lock_Demo.lockTx;
                localStorage.setItem("lockTx", lockTxHash);

                const lockTxIndex = resultObj.exports.Lock_Demo.lockUTXO;
                localStorage.setItem("lockTxIndex", lockTxIndex);

                txHashInput.value = localStorage.getItem("lockTx");;
                txHashIndexInput.value = parseInt(localStorage.getItem("lockTxIndex"));
                contractAddressInput.value = localStorage.getItem("contractAddress");
            }

        }
    }

    async function buildActionUrl_lock(args) {

        lockNumber = parseInt(lockInput.value);
        lock_script.run.dependencies.run.datum.data.fromJSON.obj.int = lockNumber;
        
        lock_script.returnURLPattern = window.location.origin + window.location.pathname;

        const contractHex = await generateSC();
        console.log(contractHex);
        lock_script.run.dependencies.run.contract.script={
            "heliosCode": `{hexToStr('${contractHex}')}`,
            "version": "latest"
        }
        const url=await gc.encode.url({
            input:JSON.stringify(lock_script),
            apiVersion:"2",
            network:"preprod",
            //encoding:"gzip",
          });
        return url;
    }

    async function buildActionUrl_unlock(args) {
        contractAddressInput.value = localStorage.getItem("contractAddress");
        unlock_script.run.buildUnlock.tx.inputs[0].txHash = localStorage.getItem("lockTx");
        unlock_script.run.buildUnlock.tx.inputs[0].index = parseInt(localStorage.getItem("lockTxIndex"));

        unlockNumber = parseInt(unlockInput.value);      
        unlock_script.run.dependencies.run.redeemer.data.fromJSON.obj.int = unlockNumber;

        const contractHex = await generateSC(unlockNumber);
        unlock_script.run.dependencies.run.contract.script={
            "heliosCode": `{hexToStr('${contractHex}')}`,
            "version": "latest"
        }

        unlock_script.returnURLPattern = window.location.origin + window.location.pathname;
        const url = await gc.encode.url({
            input:JSON.stringify(unlock_script),
            apiVersion:"2",
            network:"preprod",
            //encoding:"gzip",
          });
        return url;
    }

    async function buildActionUrl_connect(args) {
        connect_script.returnURLPattern = window.location.origin + window.location.pathname;
        const url = await gc.encode.url({
            input:JSON.stringify(connect_script),
            apiVersion:"2",
            network:"preprod",
            //encoding:"gzip",
          });;
        return url;
    }

    updateUI();
}

window.onload = function () {



    main();
}
