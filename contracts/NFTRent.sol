// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./NFTFactory.sol";

contract NFTRent is NFTFactory {
    struct rentedNFT {
        string nftKey;
        address lenderAddress;
        address borrowerAddress;
        uint16 numberOfDays; // number of days you want to buy nft on rent
        uint32 rentalStartTime;
    }

    // Mapping of nft key to rented nft details - those nfts which users have took on rent
    mapping(string => rentedNFT) public nftKeyToRentedNftDetails;
}
