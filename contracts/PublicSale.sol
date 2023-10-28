// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {IUniSwapV2Router02} from "./Interfaces.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUSDC {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function decimals() external view returns (uint8);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function _beforeTokenTransfer(address from, address to, uint256 amount) external;

    function approve(address spender, uint256 amount) external returns (bool);
}

interface IBBitesToken {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function decimals() external view returns (uint8);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function _beforeTokenTransfer(address from, address to, uint256 amount) external;

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
}

/// @custom:security-contact juanlazarte231@gmail.com
contract PublicSale is 
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable {


    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant EXECUTER_ROLE = keccak256("EXECUTER_ROLE");

    //Price
    uint256 private valueNFT;

    // 00 horas del 30 de septiembre del 2023 GMT
    uint256 constant startDate = 1696032000;

    // Maximo price NFT
    uint256 constant MAX_PRICE_NFT = 90_000 * 10 ** 18;

    mapping(uint256 => bool) public nftComprados;

    event PurchaseNftWithId(address account, uint256 id);

    ///@custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    address bbtknAdd;
    IBBitesToken bbtkn;
    address usdcAdd;
    IUSDC usdc;
    address routerAddress;
    IUniSwapV2Router02 router;

    function initialize(address addressBBTKN, address addressUSDC, address addressRouter) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        bbtknAdd = addressBBTKN;
        bbtkn = IBBitesToken(bbtknAdd);
        usdcAdd = addressUSDC;
        usdc = IUSDC(usdcAdd);
        routerAddress = addressRouter;
        router = IUniSwapV2Router02(routerAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function purchaseWithTokens(uint256 _id) public {
        require(_id < 699, "ID not found");
        require(nftComprados[_id] == false, "NFT already purchased");
        valueNFT = valueNftTokenAndUsdc(_id);

        bbtkn.approve(address(this), valueNFT);
        bbtkn.transferFrom(msg.sender, address(this), valueNFT);
        nftComprados[_id] = true;

        emit PurchaseNftWithId(msg.sender, _id);
    }

    function purchaseWithUSDC(uint256 _id, uint256 _amountIn) external {
        require(_id < 699, "ID not found");
        valueNFT = valueNftTokenAndUsdc(_id);
        // transfiere _amountIn de USDC a este contrato
        usdc.transferFrom(msg.sender, address(this), _amountIn);
        //allowance al router
        usdc.approve(routerAddress, _amountIn);
        // llama a swapTokensForExactTokens: valor de retorno de este metodo es cuanto gastaste del token input
        address[] memory path = new address[](2);
        path[0] = usdcAdd;
        path[1] = bbtknAdd;

        uint[] memory amounts = router.swapTokensForExactTokens(
            valueNFT,
            _amountIn,
            path,
            address(this),
            block.timestamp + 3600
        );
        // transfiere el excedente de USDC a msg.sender
        if (_amountIn > amounts[0]) {
            usdc.transfer(msg.sender, _amountIn - amounts[0]);
        }

        emit PurchaseNftWithId(msg.sender, _id);
    }

    function purchaseWithEtherAndId(uint256 _id) public payable {
        require(_id >= 700 && _id <= 999);
        require(nftComprados[_id] == false, "NFT already purchased");
        require(msg.value == 0.01 ether); 

        nftComprados[_id] = true;
        emit PurchaseNftWithId(msg.sender, _id);
    }

    function depositEthForARandomNft() public payable {
        require(msg.value == 0.01 ether);
        uint256 id = generateRandomNumber();
        require(nftComprados[id] == false);
        nftComprados[id] = true;
        emit PurchaseNftWithId(msg.sender, id);
    }

    function withdrawTokens() public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = bbtkn.balanceOf(address(this));
        bbtkn.transfer(msg.sender, balance);
    }

    function withdrawEth() public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    function getPriceForId(uint256 _id) public returns(uint256){
        valueNFT = valueNftTokenAndUsdc(_id);

        return valueNFT;
    }

    receive() external payable {
        depositEthForARandomNft();
    }


    ////////////////////////////////////////////////////////////////////////
    /////////                    Helper Methods                    /////////
    ////////////////////////////////////////////////////////////////////////

    function valueNftTokenAndUsdc (uint256 _id) public view returns (uint256) {
        uint256 valueNft;
        require (_id >= 0 && _id <= 699, "Id NFT invalid.");
        if (_id >= 0 && _id <= 199) {
            valueNft = 1000 * 10 ** 18;
        }else if (_id >= 200 && _id <= 499) {
            valueNft = _id * (20 * 10 ** 18);
        }else if (_id >= 500 && _id <= 699) {
            valueNft = (10000 *10 ** 18 ) + ((block.timestamp - 1696032000)/86400) + 2000 * 10 ** 18 ;
            if (valueNft > MAX_PRICE_NFT ) {
                valueNft = MAX_PRICE_NFT;
            }
        }
        return valueNft;
    }

    function generateRandomNumber() public view returns (uint256) {
        // Generar un número aleatorio en el rango de 0 a 299
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp))) % 300;

        // Sumar 700 al número aleatorio para obtener un valor en el rango de 700 a 999
        return randomNumber + 700;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
