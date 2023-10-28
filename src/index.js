import { Contract, ethers } from "ethers";

/* import usdcTknAbi from "../artifacts/contracts/USDCoin.sol/USDCoin.json.";
import bbitesTokenAbi from "../artifacts/contracts/BBitesToken.sol/BBitesToken.json";
import publicSaleAbi from "../artifacts/contracts/PublicSale.sol/PublicSale.json";
import nftTknAbi from  "../artifacts/contracts/CuyCollectionNft.sol/CuyCollectionNft.json" */

var usdcTknAbi = require("../artifacts/contracts/USDCoin.sol/USDCoin.json").abi;
var bbitesTokenAbi = require("../artifacts/contracts/BBitesToken.sol/BBitesToken.json").abi;
var publicSaleAbi = require("../artifacts/contracts/PublicSale.sol/PublicSale.json").abi;
var nftTknAbi = require("../artifacts/contracts/CuyCollectionNft.sol/CuyCollectionNft.json").abi;

// SUGERENCIA: vuelve a armar el MerkleTree en frontend
// Utiliza la libreria buffer
import buffer from "buffer/";
import walletAndIds from "../wallets/walletList";
import { MerkleTree } from "merkletreejs";
/* import { getRootFromMT, generateMerkleProof } from "../utils/merkleTree"; */
var Buffer = buffer.Buffer;
var merkleTree;

function hashToken(tokenId, account) {
  return Buffer.from(
    ethers
      .solidityPackedKeccak256(["uint256", "address"], [tokenId, account])
      .slice(2),
    "hex"
  );
}
function buildMerkleTree() { 
  var elementosHasheados = walletAndIds.map(({ tokenId, account }) => {
    return hashToken(tokenId, account);
  });

  merkleTree = new MerkleTree(elementosHasheados, ethers.keccak256, {
    sortPairs: true,
  });

  root = merkleTree.getHexRoot();

  console.log(root);
}

var provider, signer, account;
var usdcTkContract, bbitesTknContract, pubSContract, nftContract;
var usdcAddress, bbitesTknAdd, pubSContractAdd;

function initSCsGoerli() {
  provider = new ethers.BrowserProvider(window.ethereum);

  usdcAddress = "0x881b3309876334413EB7e70BDDcd4DD7a86f9483";
  bbitesTknAdd = "0x830EDAc0c2c4d82891eeb40BBF6430ED5C6bB15B";
  pubSContractAdd = "0x35a764f1bF02Db7cB039604de76787186039BBAB";

  usdcTkContract = new Contract(usdcAddress, usdcTknAbi, provider);
  bbitesTknContract = new Contract(bbitesTknAdd, bbitesTokenAbi, provider);
  pubSContract = new Contract(pubSContractAdd, publicSaleAbi, provider);
}

function initSCsMumbai() {
  provider = new ethers.BrowserProvider(window.ethereum);

  var nftAddress = "0x9F25d4Cfc7754Aa4559Fba18ED11F90157c517B4";

  nftContract = new Contract(nftAddress, nftTknAbi, provider);
}

function setUpListeners() {
  // Connect to Metamask
  var bttn = document.getElementById("connect");
  var walletIdEl = document.getElementById("walletId");
  bttn.addEventListener("click", async function () {
    if (window.ethereum) {
      [account] = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Billetera metamask", account);
      walletIdEl.innerHTML = account;
      signer = await provider.getSigner(account);
    }
  });

  // USDC Balance - balanceOf
  var bttn = document.getElementById("usdcUpdate");
  bttn.addEventListener("click", async function () {
    var balance = await usdcTkContract.balanceOf(account);
    var balanceEl = document.getElementById("usdcBalance");
    balanceEl.innerHTML = ethers.formatUnits(balance, 6);
  });

  // Bbites token Balance - balanceOf
  var bttn = document.getElementById("bbitesTknUpdate");
  bttn.addEventListener("click", async function () {
    var balance = await bbitesTknContract.balanceOf(account);
    var balanceEl = document.getElementById("bbitesTknBalance");
    balanceEl.innerHTML = ethers.formatUnits(balance, 18);
  })

  // APPROVE BBTKN
  // bbitesTknContract.approve
  var bttn = document.getElementById("approveButtonBBTkn");
  bttn.addEventListener("click", async function () {
    var aproveCant = document.getElementById("approveInput");
    var approveTokens = await bbitesTknContract.connect(signer).approve(pubSContractAdd,aproveCant);
    var muestraAproveError = document.getElementById("approveError");
    muestraAproveError.innerHTML = approveTokens;
    console.log(approveTokens);
  })

  // APPROVE USDC
  // usdcTkContract.approve
  var bttn = document.getElementById("approveButtonUSDC");
  bttn.addEventListener("click", async function () {
    var approveCantusdc = document.getElementById("approveInputUSDC");
    var approveUsdc = await usdcTkContract.connect(signer).approve(pubSContractAdd, approveCantusdc);
    var muestraAproveError = document.getElementById("approveErrorUSDC");
    muestraAproveError.innerHTML = approveUsdc;
    console.log(approveUsdc);
  })

  // purchaseWithTokens
  var bttn = document.getElementById("purchaseButton");
  bttn.addEventListener("click", async function() {
    var purchaseId = document.getElementById("purchaseInput");
    var purchaseTokens = await pubSContract.connect(signer).purchaseWithTokens(purchaseId);
    console.log(purchaseTokens);
  })

  // purchaseWithUSDC
  var bttn = document.getElementById("purchaseButtonUSDC");
  bttn.addEventListener("click", async function () {
    var purchaseUsdcId = document.getElementById("purchaseInputUSDC");
    var amountUsdc = document.getElementById("amountInUSDCInput");
    var purchaseUsdc = await pubSContract.connect(signer).purchaseWithUSDC(purchaseUsdcId, amountUsdc);
    console.log(purchaseUsdc);
  })

  // purchaseWithEtherAndId
  var bttn = document.getElementById("purchaseButtonEtherId");
  bttn.addEventListener("click", async function() {
    var purchaseInputEtherId = document.getElementById("purchaseInputEtherId");
    var purchaseEtherId = await pubSContract.connect(signer).purchaseWithEtherAndId(purchaseInputEtherId);
    console.log(purchaseEtherId);
  })

  // send Ether
  var bttn = document.getElementById("sendEtherButton");
  bttn.addEventListener("click", async function() {
    var sendEther = await pubSContract.connect(signer).depositEthForARandomNft();
    console.log(sendEther);
  })

  // getPriceForId
  var bttn = document.getElementById("getPriceNftByIdBttn");
  bttn.addEventListener("click", async function() {
    var getPriceNftByIdInput = document.getElementById("priceNftIdInput");
    var getPriceNftById = await pubSContract.connect(signer).valueNftTokenAndUsdc(getPriceNftByIdInput);
    var balanceSpan = document.getElementById("priceNftByIdText");
    balanceSpan.innerHTML = ethers.formatUnits(getPriceNftById)
    console.log(getPriceNftById);
  })

  // getProofs
  var bttn = document.getElementById("getProofsButtonId");
  bttn.addEventListener("click", async () => {
    var id = document.getElementById("inputIdProofId");
    var address = document.getElementById("inputAccountProofId")
    var proofs = merkleTree.getHexProof(hashToken(id, address));
    navigator.clipboard.writeText(JSON.stringify(proofs));
    var showProofAndId = document.getElementById("showProofsTextId");
    showProofAndId.innerHTML = proofs;
  });

  // safeMintWhiteList
  var bttn = document.getElementById("safeMintWhiteListBttnId");
  // usar ethers.hexlify porque es un array de bytes
  bttn.addEventListener("click", async function(){
    var safeMintWhiteList = await nftContract.connect(signer).safeMintWhiteList(to, tokenId, proofs);
    var to = document.getElementById("whiteListToInputId");
    var tokenId = document.getElementById("whiteListToInputTokenId");
    var proofs = document.getElementById("whiteListToInputProofsId").value;
    proofs = JSON.parse(proofs).map(ethers.hexlify);

    console.log(safeMintWhiteList);
  })


  // buyBack
  var bttn = document.getElementById("buyBackBttn");
  bttn.addEventListener("click", async function(){
    var buyBack = await nftContract.connect(signer).buyBack(buyBackInputId);
    console.log(buyBack);
  })
}

function setUpEventsContracts() {
  var pubSList = document.getElementById("pubSList");
  // pubSContract - "PurchaseNftWithId"
  pubSList.addEventListener("click", async function() {
    pubSContract.on("PurchaseNftWithId", (from, id) => {
      console.log("From", from);
      console.log("Id", id);
    });
  })

  var bbitesListEl = document.getElementById("bbitesTList");
  // bbitesCListener - "Transfer"
  bbitesListEl.addEventListener("click", async function() {
    bbitesTknContract.on("Transfer", (from, to, id) => {
      console.log("From", from);
      console.log("To", to);
      console.log("Id", id);
    })
  })

  var nftList = document.getElementById("nftList");
  // nftCListener - "Transfer"
  nftList.addEventListener("click", async function(){
    nftContract.on("Transfer", (from, to, id) => {
      console.log("From", from);
      console.log("To", to);
      console.log("Id", id);
    })
  })

  var burnList = document.getElementById("burnList");
  // nftCListener - "Burn"
  burnList.addEventListener("click", async function() {
    nftContract.on("Burn",(from, id) => {
      console.log("From", from);
      console.log("Id", id);
    });
  })
}

async function setUp() {
  window.ethereum.on("chainChanged", (chainId) => {
    window.location.reload();
  });

  initSCsGoerli();

  initSCsMumbai();

  setUpListeners();

  setUpEventsContracts();

  buildMerkleTree();
}

setUp()
  .then()
  .catch((e) => console.log(e));


console.log("Hola");