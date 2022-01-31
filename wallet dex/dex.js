/*COSTANTI DOM */
// tabella con la lista dell wallet
const $tabella = document.querySelector("#js-lista-token-wallet");
const pulisci = `<table class="table table-dark table-sm" id="js-lista-token-wallet">
<thead class="table-dark">
    <td>
        #
    </td>
    <td>
        Token
    </td>
    <td>
        Amount
    </td>
    <td>
        Swap
    </td>
</thead>
<tbody id="body-tabella">
    
</tbody>
<tfoot>

</tfoot>
</table>`
//selettori del form per lo swap.
const $list_coin_from = document.querySelector("#js-coin-from");
const $list_coin_to = document.querySelector("#js-coin-to");
// input box valori swap
const $value_from = document.querySelector("#js-value-from");
const $value_to = document.querySelector("#js-value-to");
// pulsanti swap
const $swap = document.querySelector("#js-submit-swap");
const $approve = document.querySelector("#js-submit-approve");


/* INIZIAZIONE MORALIS SERVER */

const serverUrl = "SERVER URL";
const appId = "YOUR APP ID";
Moralis.start({ serverUrl, appId });
//const web3Provider = await Moralis.enableWeb3();


/*FUNZIONI */

const set_list_to = (coin_1inch) => {
    $list_coin_to.innerHTML += coin_1inch.map(token => `<option value="${token.decimals}-${token.address}">${token.symbol}  -------> ${token.address} </option>`);
}
const set_list_from = (event) => {
    const token = event.target.dataset;
    $list_coin_from.innerHTML = `<option value="${token.decimals}-${token.address}">${token.symbol}  -------> ${token.address} </option>`;
    price(event)
}
const clear = (event) => {
    event.preventDefault();
    $value_to.value = 0
    $value_from.value = 0;
    $list_coin_from.innerHTML = `<option value="18-0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee">MATIC ------->
    0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee</option>`;
    balanca_native();
}

const set0 = (event) => {
    event.preventDefault();
    $value_to.value = 0;
    $value_from.value = 0;

}


/*FUNZIONI ASINCRONE */
const web3Provider = async () => {
    return await Moralis.enableWeb3();
}

const balanca_native = async () => {
    const balance = await Moralis.Web3API.account.getNativeBalance({ chain: "polygon" });
    document.querySelector("#js-balance").innerHTML = `<strong>Matic balance -> ${Moralis.Units.FromWei(balance.balance)}</strong>`
}

const Buy_Fiat = async () => { Moralis.Plugins.fiat.buy() }

const list_wallet = async () => {
    // funzione che scarica il contenuto del wallet durante il login
    const balances = await Moralis.Web3API.account.getTokenBalances({ chain: 'polygon' });
    //console.log(balances);

    $tabella.innerHTML += balances.map((token, index) =>
        `<tr>
            <td>${index + 1}</td>
            <td>${token.symbol}</td>
            <td>${Moralis.Units.FromWei(token.balance, token.decimals)}</td>
            <td><button type="button" class="btn btn-success" id="btn-swap"
                    data-address="${token.token_address}"
                    data-symbol="${token.symbol}"
                    data-decimals="${token.decimals}"
                    data-max="${Moralis.Units.FromWei(token.balance, token.decimals)}"
            >Swap</button></td>
         </tr>`).join("");

    for (let $button_swap of $tabella.querySelectorAll("#btn-swap")) {
        // Swap crypto
        $button_swap.addEventListener("click", set_list_from)
    }


};

const coin_coinpaprika = async () => {
    //lista simboli token presi da coinpaprica
    const response = await fetch("https://api.coinpaprika.com/v1/coins");
    const coins = await response.json();
    const coin_list = Object.values(coins);

    return coin_list.filter(token => token.rank >= 1 && token.rank <= 300)
        .map(token => token.symbol);

}

const coin_1inch = async (coin_coinpaprika) => {
    //lista per lo swap filtrata con la top 300 di coinpaprika
    const response = await fetch("https://api.1inch.io/v4.0/137/tokens");
    const tokens = await response.json();
    const token_list = Object.values(tokens.tokens);

    return token_list.filter(token => coin_coinpaprika.includes(token.symbol));

}

const price = async (event) => {
    event.preventDefault();

    let token_from = $list_coin_from.value;
    let token_to = $list_coin_to.value;
    let amount_from = $value_from.value;
    let [decimal_from, address_from] = token_from.split("-");
    let [decimal_to, address_to] = token_to.split("-");
    let new_amount = amount_from * (10 ** decimal_from);
    console.log(new_amount);
    try {
        const Api = `https://api.1inch.io/v4.0/137/quote?fromTokenAddress=${address_from}&toTokenAddress=${address_to}&amount=${new_amount}`
        //console.log(Api);
        const response = await fetch(Api);
        const quote = await response.json();

        const price = Number(quote.toTokenAmount);
        const router = Object.values(quote.protocols)
        //console.log(router);

        $value_to.value = price / (10 ** decimal_to);

        const estimate_gas = Number(quote.estimatedGas);

        document.querySelector("#js-p-gasfee").innerHTML = `Estimate Gas fee => ${Moralis.Units.FromWei(estimate_gas)}`
        hasAllowance(event)

    } catch (e) {
        document.querySelector("#js-p-allowance").innerHTML = "swap not possible";
        $approve.removeAttribute("disabled");
        $swap.setAttribute('disabled', 'disabled');
        console.log(e);
        //clear(event);
    }


    //document.querySelector("#js-p-router").innerHTML = router.map(token => `Router swap => ${token.name}`);





}


// login logout
async function login() {
    /*MORALIS LOGIN */
    let user = Moralis.User.current();
    if (!user) {
        user = await Moralis.authenticate();
    }
    console.log("logged in user:", user);
    $tabella.innerHTML = pulisci;
    list_wallet();
    balanca_native();
}

async function logOut() {
    /*MORALIS LOGIN */
    await Moralis.User.logOut();
    console.log("logged out");
    $tabella.innerHTML = pulisci;
    document.querySelector("#js-balance").innerHTML = "";
    clear();
}

// swap 1inch 

async function swap(event) {
    event.preventDefault();
    let token_from = $list_coin_from.value;
    let token_to = $list_coin_to.value;
    let amount_from = $value_from.value;
    let [decimal_from, fromTokenAddress] = token_from.split("-");
    let [decimal_to, toTokenAddress] = token_to.split("-");
    let new_amount = amount_from * (10 ** decimal_from);
    const receipt = await Moralis.Plugins.oneInch.swap({
        chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
        fromTokenAddress, // The token you want to swap
        toTokenAddress, // The token you want to receive
        amount: new_amount,
        fromAddress: Moralis.User.current().get("ethAddress"), // Your wallet address
        slippage: 1,
    });
    console.log(receipt);
    balanca_native();
}
async function approve(event) {
    event.preventDefault();
    let token_from = $list_coin_from.value;
    let [decimal_from, fromTokenAddress] = token_from.split("-");
    await Moralis.Plugins.oneInch.approve({
        chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
        tokenAddress: fromTokenAddress, // The token you want to swap
        fromAddress: Moralis.User.current().get("ethAddress"), // Your wallet address
    });
    balanca_native();
}
async function hasAllowance(event) {
    event.preventDefault();
    let token_from = $list_coin_from.value;
    let amount_from = $value_from.value;
    let [decimal_from, fromTokenAddress] = token_from.split("-");
    let new_amount = amount_from * (10 ** decimal_from);

    const allowance = await Moralis.Plugins.oneInch.hasAllowance({
        chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
        fromTokenAddress, // The token you want to swap
        fromAddress: Moralis.User.current().get("ethAddress"), // Your wallet address
        amount: new_amount,
    });
    console.log(`The user has enough allowance: ${allowance}`);

    document.querySelector("#js-p-allowance").innerHTML = `The user has enough allowance: ${allowance}`;
    if (!allowance) {
        $approve.removeAttribute("disabled");
        $swap.setAttribute('disabled', 'disabled');
    } else {

        $approve.setAttribute('disabled', 'disabled');
        $swap.removeAttribute("disabled");
    }
}


/*AZIONI */
web3Provider();
coin_coinpaprika()
    .then(coin_1inch)
    .then(set_list_to);

//swap approve e swap
$swap.addEventListener("click", swap);
$approve.addEventListener("click", approve);


/*MORALIS LOGIN */
document.getElementById("btn-login").onclick = login;
document.getElementById("btn-logout").onclick = logOut;
/*BUY CRYPTOvsFiat*/
document.querySelector("#btn-buyCryto").addEventListener("click", Buy_Fiat);

// Aggiornamento form
$value_from.addEventListener("input", price);
$value_to.addEventListener("click", price);
$list_coin_from.addEventListener("click", set0);
$list_coin_to.addEventListener("click", set0);
document.querySelector("#js-clear-form").addEventListener("click", clear);
