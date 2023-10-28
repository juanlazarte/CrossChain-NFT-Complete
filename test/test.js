var { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var { expect } = require("chai");
var { ethers, network } = require("hardhat");
var { time } = require("@nomicfoundation/hardhat-network-helpers");

const { getRole, deploySC, deploySCNoUp, ex, pEth } = require("../utils");
const { getRootFromMT, generateMerkleProof } = require("../utils/merkleTree");

const MINTER_ROLE = getRole("MINTER_ROLE");
const BURNER_ROLE = getRole("BURNER_ROLE");

const factoryArtifact = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const routerArtifact = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const pairArtifact = require("@uniswap/v2-periphery/build/IUniswapV2Pair.json");
const WETH9 = require("../WETH9.json");

// 00 horas del 30 de septiembre del 2023 GMT
var startDate = 1696032000;


describe("NFT Token", function () {
    async function deployFixture() {
        var cuyTokenUpgradeable, cuyTokenUpProxy; 
        const [owner, alice, bob] = await hre.ethers.getSigners();

        cuyTokenUpgradeable = await hre.ethers.getContractFactory("CuyCollectionNft");
        cuyTokenUpProxy = await hre.upgrades.deployProxy(cuyTokenUpgradeable, {
            kind: "uups",
        });

        return { owner, alice, bob, cuyTokenUpProxy }
    }

    describe("Minteando", function () {
        var ONE_ETHER = `0x${ethers.parseEther("1").toString(16)}`;

        it("Minteando Owner alice", async () => {
            var { cuyTokenUpProxy, alice } = await loadFixture(deployFixture);
            
            await cuyTokenUpProxy.safeMint(alice.address, 0);

            var balAlice = await cuyTokenUpProxy.balanceOf(alice.address);
            expect(balAlice).to.equal(1);
        });

        it("Safe mint protegido por MinterRole", async () => {
            const {owner, alice, cuyTokenUpProxy } = await loadFixture(
                deployFixture
            );
            await cuyTokenUpProxy.grantRole(MINTER_ROLE, owner.address);
            
            await expect
                (cuyTokenUpProxy.connect(alice).safeMint(alice.address, 0)).to.be.revertedWith(
                `AccessControl: account ${alice.address.toLowerCase()} is missing role ${MINTER_ROLE}`
            );
        });

        it("Mintear numero invalido", async () => {
            var {cuyTokenUpProxy, alice} = await loadFixture(deployFixture);

            var numeroInvalido = 2100;

            await expect(cuyTokenUpProxy.safeMint(alice.address, numeroInvalido)).to.be.revertedWith("Id invalido");
        });

        it("Mintear con id invalido en safemint 1000-1999", async () => {
            var {cuyTokenUpProxy, owner, alice} = await loadFixture(deployFixture);
            await cuyTokenUpProxy.grantRole(MINTER_ROLE, owner.address);

            var account = "0xC840F562D9F69b46b4227003E01525CB99344B72";
            var privateKey = "0x6e02fc34a5301d5d29825f05c1499333c3007a53454a14f0260cdf84e741426f";
            var numeroInvalido = 200;

            await network.provider.send("hardhat_setBalance", [
                account,
                ONE_ETHER,
            ])

            const accountSigner = new ethers.Wallet(privateKey, ethers.provider);
            var root = getRootFromMT();
            var proofs = await generateMerkleProof(numeroInvalido, account);

            await expect(
                cuyTokenUpProxy.connect(accountSigner).safeMintWhiteList(account, numeroInvalido, proofs)
            ).to.rejectedWith("Id invalido");
        });

        it("El NFT no puede mintearse mas de una vez", async () => {
            var {cuyTokenUpProxy, owner, alice, bob} = await loadFixture(deployFixture);
            await cuyTokenUpProxy.grantRole(MINTER_ROLE, owner.address);

            var id = 200;
            await cuyTokenUpProxy.connect(owner).safeMint(alice.address, id);
            await expect(
                cuyTokenUpProxy.connect(owner).safeMint(bob.address, id)
            ).to.revertedWith("ERC721: token already minted")
        })

        it("La wallet no esta en el whitelist", async () => {
            var {cuyTokenUpProxy, owner, alice, bob} = await loadFixture(deployFixture);
            await cuyTokenUpProxy.grantRole(MINTER_ROLE, owner.address);
            var walletNoLista = "0x7e0114bAE6d259792656A834980e6ceb7C818Cbf";
            var account = walletNoLista;
            var privateKeyNoLista = "86468f88bb3d63f649f7fad0df688f972951268efd7e0b79ebd272ef8c5be637";
            var privateKey = privateKeyNoLista;

            await network.provider.send("hardhat_setBalance", [
                account,
                ONE_ETHER,
            ]);

            var signerAccount = new ethers.Wallet(privateKey, ethers.provider);
            var root = getRootFromMT();
            var proofs = await generateMerkleProof(1000, account);
            await expect(
                cuyTokenUpProxy.connect(signerAccount).safeMintWhiteList(account, 1000, proofs)
            ).to.rejectedWith("No eres parte de la lista");
        })

    })
    describe("Disparando event", function() {
        it("Lanzando el evento burn", async () => {
            var {cuyTokenUpProxy, alice, bob, owner} = await loadFixture(deployFixture);

            await cuyTokenUpProxy.safeMint(owner.address, 0);

            await expect(cuyTokenUpProxy.buyBack(0)).to.emit(cuyTokenUpProxy, "Burn").withArgs(owner.address, 0);
        });
    })
})

describe("Public Sale", function() {
    async function deployFixturePs() {
        var usdc, bbtknProxy, publicSaleUpProxy;
        const [owner, alice, bob, carl] = await hre.ethers.getSigners();

        //uniswap
        var Factory = new ethers.ContractFactory(
            factoryArtifact.abi,
            factoryArtifact.bytecode,
            owner
        );
        var factory = await Factory.deploy(owner.address);

        usdc = await deploySCNoUp("USDCoin", []);
        var usdcAddress = await usdc.getAddress();

        bbtknProxy = await deploySC("BBitesToken", []);
        var bbitesTokenAddress = await bbtknProxy.getAddress();

        // uniswap
        var Weth = new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, owner);
        var weth = await Weth.deploy();
        await factory.createPair(bbtknProxy.target, usdc.target);
        var pairAddress = await factory.getPair(bbtknProxy.target, usdc.target);
        var pair = new ethers.Contract(pairAddress, pairArtifact.abi, owner);
        var Router = new ethers.ContractFactory(
        routerArtifact.abi,
        routerArtifact.bytecode,
        owner
        );
        var router = await Router.deploy(factory.target, weth.target);

        var routerAdd = await router.getAddress();

        publicSaleUpProxy = await deploySC("PublicSale", [bbitesTokenAddress, usdcAddress, routerAdd]);

        await bbtknProxy.approve(routerAdd, bbtknProxy.balanceOf(owner));
        await usdc.approve(routerAdd, usdc.balanceOf(owner));
        await router.addLiquidity(
        bbtknProxy.target,
        usdc.target,
        await bbtknProxy.balanceOf(owner),
        await usdc.balanceOf(owner),
        await bbtknProxy.balanceOf(owner),
        await usdc.balanceOf(owner),
        owner,
        Math.floor(Date.now() / 1000 + 10 * 60)
        );;

        return { publicSaleUpProxy, bbtknProxy, usdc, owner, alice, bob, carl, pair, routerAdd};
    }

    var pEth = ethers.parseEther;
    var TOKENS = pEth("1000");


    describe("Purchase Tokens", () => {
        it("Acuña tokens en la cuenta Alice", async function () {
            var { alice, bbtknProxy } = await loadFixture(deployFixturePs);
            await bbtknProxy.mint(alice.address, TOKENS);
            var balanceAlice = await bbtknProxy.balanceOf(alice.address);
            expect(balanceAlice).to.be.equal(
              TOKENS,
              "No se hizo el mint correctamente"
            );
          });

        it("Approve correcto", async () => {
            var { alice, bbtknProxy, publicSaleUpProxy } = await loadFixture(deployFixturePs);
            await bbtknProxy.connect(alice).approve(publicSaleUpProxy, TOKENS);

            var allowance = await bbtknProxy.allowance(alice.address, publicSaleUpProxy);
            expect(allowance).to.be.equal(TOKENS, "No se hizo el approve correctamente");
        })  

        it("Purchase with tokens numero invalido", async () => {
            var {publicSaleUpProxy, alice, bob, owner} = await loadFixture(deployFixturePs);
            var numeroInvalido = 2710;

            await expect(publicSaleUpProxy.connect(alice).purchaseWithTokens(numeroInvalido)).to.be.revertedWith("ID not found");
        })

        it("Compra el token correctamente", async function () {
            var { alice, bbtknProxy, publicSaleUpProxy } = await loadFixture(
              deployFixturePs
            );
      
            await bbtknProxy.mint(alice.address, TOKENS);
            await bbtknProxy.connect(alice).approve(publicSaleUpProxy.getAddress(), TOKENS);
            var tx = await publicSaleUpProxy.connect(alice).purchaseWithTokens(2);
            expect(tx).to.emit(publicSaleUpProxy, "PurchaseNftWithId");
          });
    })

    describe("Purchase whit USDC", () => {
        var usdcAmount = 10000000000;

        it("Acuña usdc cuenta de Alice", async () => {
            var { alice, usdc} = await loadFixture(deployFixturePs);
            await usdc.mint(alice.address, usdcAmount);

            var balanceAlice = await usdc.balanceOf(alice.address);
            expect(balanceAlice).to.equal(usdcAmount, "No se minteo usdc");
        });

        it("Purchase with usdc numero invalido", async () => {
            var {publicSaleUpProxy, alice} = await loadFixture(deployFixturePs);
            var numeroInvalido = 2710;

            await expect(publicSaleUpProxy.connect(alice).purchaseWithUSDC(numeroInvalido, usdcAmount)).to.be.revertedWith("ID not found");
        });

        it("Approve correcto", async () => {
            var { alice, usdc, publicSaleUpProxy } = await loadFixture(deployFixturePs);
            await usdc.connect(alice).approve(publicSaleUpProxy, usdcAmount);

            var allowance = await usdc.allowance(alice.address, publicSaleUpProxy);
            expect(allowance).to.be.equal(usdcAmount, "No se hizo el approve correctamente");
        });  

        it("El NFT no puede mintearse mas de una vez", async () => {

            var { publicSaleUpProxy, bbtknProxy, usdc, owner, alice, bob, carl } = await loadFixture(deployFixturePs);
    
            var id = 500;
            var amount = 40000 * 10 ** 6;
    
            var price = await publicSaleUpProxy.valueNftTokenAndUsdc(id);
    
            await usdc.mint(owner.address, amount);
    
            await usdc.connect(owner).approve(publicSaleUpProxy.target, amount);
    
            var amounts = await publicSaleUpProxy.connect(owner).purchaseWithUSDC(id, amount);
    
    
            await usdc.connect(owner).approve(publicSaleUpProxy.target, price);
    
    
            await expect(
                publicSaleUpProxy.connect(owner).purchaseWithUSDC(id, amount)
              ).to.revertedWith(
              "ERC20: transfer amount exceeds balance"
            );
          });

        it("Compra correctamente", async () => {
            var { publicSaleUpProxy, usdc, alice, bbtknProxy, routerAdd, pair, owner } = await loadFixture(deployFixturePs);

            var price = 40000 * 10 **6;

            await usdc.mint(alice.address, price);

            await usdc.connect(alice).approve(publicSaleUpProxy.target, price);

            console.log("saldo Alice en USDC: ", await usdc.balanceOf(alice));
            console.log("saldo Contract en BBites: ", await bbtknProxy.balanceOf(publicSaleUpProxy.getAddress()));
            console.log("Allowance del contrato en USDC: ", await usdc.allowance(alice.address, publicSaleUpProxy.getAddress()));

            var tx = await publicSaleUpProxy.connect(alice).purchaseWithUSDC(3, price);
            await expect(tx).to.emit(publicSaleUpProxy, "PurchaseNftWithId").withArgs(alice.address, 3);

            console.log("saldo Alice en USDC: ", await usdc.balanceOf(alice));
            console.log("saldo Contract en Bbites: ", await bbtknProxy.balanceOf(publicSaleUpProxy.getAddress()));
            console.log("saldo Contract en USDC: ", await usdc.balanceOf(await publicSaleUpProxy.getAddress()));

        });
    })
    describe("Purchase whit Ether and Id", async () => {
        it("Comprando con cant de ether incorrecta", async () => {
            var {publicSaleUpProxy, alice } = await loadFixture(deployFixturePs);
            var tx = publicSaleUpProxy.connect(alice).purchaseWithEtherAndId(703, {value: ethers.parseEther("0.02")});
            await expect(tx).to.be.reverted;
        });

        it("Purchase with usdc numero invalido", async () => {
            var {publicSaleUpProxy, alice} = await loadFixture(deployFixturePs);
            var numeroInvalido = 2710;

            await expect(publicSaleUpProxy.connect(alice).purchaseWithEtherAndId(numeroInvalido)).to.be.reverted;
        });
        
        it("Comprando de forma exitosa", async () => {
            var {publicSaleUpProxy, alice} = await loadFixture(deployFixturePs);

            var cantidad = ethers.parseEther("0.01");

            var tx = await publicSaleUpProxy.connect(alice).purchaseWithEtherAndId(777, {value: cantidad});
            await expect(tx).to.emit(publicSaleUpProxy, "PurchaseNftWithId").withArgs(alice.address, 777);
        })

        it("Lanzando event", async () => {
            var { publicSaleUpProxy, owner,  alice } = await loadFixture(deployFixturePs);
        
            var amount = ethers.parseEther("0.01");
            var tokenId = 777;
            await expect(
                publicSaleUpProxy.connect(owner).purchaseWithEtherAndId(tokenId, {value: amount})
                ).to.emit(publicSaleUpProxy, "PurchaseNftWithId").withArgs(owner.address, tokenId);
            
        })
    })
    describe("Purchase whit ether ramdon", async () => {
        it("Comprando con cant de ether incorrecta", async () => {
            var {publicSaleUpProxy, alice } = await loadFixture(deployFixturePs);

            var tx = alice.sendTransaction({
                to: publicSaleUpProxy.getAddress(),
                value: ethers.parseEther("0.001")
            });
            await expect(tx).to.be.reverted;
        })

        it("Comprando con cant de ether correcta", async () => {
            var {publicSaleUpProxy, alice } = await loadFixture(deployFixturePs);

            var amount = ethers.parseEther("0.01");

            var tx = alice.sendTransaction({
                to: publicSaleUpProxy.getAddress(),
                value: amount
            });

            await expect(tx).to.emit(publicSaleUpProxy, "PurchaseNftWithId");
        })
    })
}) 



