// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract NFTFactory {
    // Structure for storing nft properties
    struct nftProps {
        string nftKey; // Key is unique string and concatenation of nftAddress and nftId

        address nftOwner;
        address nftAddress;
        uint256 nftId;

        string nftName;
        string nftImageURL;
    }

    // Address of all the users of the app
    address[] internal userAddressList;

    // Mapping of above nft key to nftProps
    mapping (string => nftProps) public nftKeyToNftProps;

    function getContractBalance() external view returns(uint) {
        return address(this).balance;
    }

    function getUserAddressList() public view returns(address[] memory) {
        return userAddressList;
    }
}