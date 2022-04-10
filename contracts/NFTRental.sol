// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NFTRental {

    // constructor() ERC721("NFTRental", "MVVT") { }

    // Structure for storing nft properties
    struct nftProps {
        string nftKey; // Key is unique string and concatenation of nftAddress and nftId

        address nftOwner;
        address nftAddress;
        uint256 nftId;
        uint32 wishlistCount; // No of users having this nft in wishlist

        string nftName;
        string nftImageURL;
    }

    struct lendedNFT {
        string nftKey;
        address lenderAddress;
        address borrowerAddress;
        uint32 dueDate; // Time available for renting nft (in UTC)
        uint256 dailyRent; // Amount of rent to be paid per day - in wei
        uint256 collateral; // Amount of collateral required - in wei
    }

    struct rentedNFT {
        string nftKey;
        address lenderAddress;
        address borrowerAddress;
        uint16 numberOfDays; // number of days you want to buy nft on rent
        uint32 rentalStartTime;
    }

    struct User {
        address userAddress; // Address of user of app 

        mapping (uint32 => lendedNFT) userLendedNfts;
        uint32 userLendedNftsSize;

        mapping (uint32 => rentedNFT) userRentedNfts;
        uint32 userRentedNftsSize;

        mapping (uint32 => lendedNFT) userWishlist;
        uint32 userWishlistSize;

        // lendedNFT[] userLendedNfts;
        // rentedNFT[] userRentedNfts;
        // lendedNFT[] userWishlist;
    }

    // Address of all the users of the app
    address[] private userAddressList;

    // Mapping of user address to user details
    mapping (address => User) public addressToUser;

    // Key strings of nfts available to rent on app
    string[] private nftKeysListAvaiableForRent;

    // Mapping of above key to nftProps
    mapping (string => nftProps) public nftKeyToNftProps;

    // Mapping of nft key to lended nft details
    mapping (string => lendedNFT) public nftKeyToLendedNftDetails;

    // Mapping of nft key to rented nft details - those nfts which users have took on rent
    mapping (string => rentedNFT) public nftKeyToRentedNftDetails;

    // Events
    event NFTLended(); 
    event NFTRented();

    function getUserAddressList() public view returns(address[] memory) {
        return userAddressList;
    }

    function getNftKeysListAvaiableForRent() public view returns(string[] memory) {
        return nftKeysListAvaiableForRent;
    }

    function getUserLendedNFTDetails(address _userAddress,uint32 _index) public view returns(lendedNFT memory) {
        // Should not be a zero address
        require(_userAddress!=address(0),"Invalid address");

        User storage user = addressToUser[_userAddress];

        // User should exist
        require(user.userAddress!=address(0),"User does not exists");

        // Index should be less than userLendedNftsSize
        require(_index<user.userLendedNftsSize,"Nft at the given index does not exist");

        return user.userLendedNfts[_index];
    }

    function addUser(address _userAddress) external {
        // Should not be a zero address
        require(_userAddress!=address(0),"Invalid address");

        // msg.sender should be equal to _userAddress
        require(msg.sender==_userAddress,"Only the user can add his account to app");

        // Check if user already exist or not
        if (addressToUser[_userAddress].userAddress==address(0)) {
            // User does not exist
            User storage newUser = addressToUser[_userAddress];
            newUser.userAddress=_userAddress;
            newUser.userLendedNftsSize=0;
            newUser.userRentedNftsSize=0;
            newUser.userWishlistSize=0;

            userAddressList.push(_userAddress);
        }
    }

    // Main lend function called by frontend
    function addNFTToLend(
        string memory _nftKey,
        address _nftOwner,
        address _nftAddress,
        uint256 _nftId,
        uint32 _wishlistCount, 
        string memory _nftName,
        string memory _nftImageURL,
        address _lenderAddress,
        uint32 _dueDate,
        uint256 _dailyRent,
        uint256 _collateral
    ) external payable {

        // Can't lend anyone else's NFT 
        require(msg.sender==_lenderAddress,"Can't lend someone else's NFT");

        // Lender address should exist in our app
        require(addressToUser[_lenderAddress].userAddress!=address(0),"User does not exist");

        // NFT should not already available for renting
        //There is no proper way to check if a key already exists or not therefore we are checking for default value i.e., all bits are 0
        require(nftKeyToNftProps[_nftKey].nftAddress==address(0),"NFT is already available for renting");
        require(nftKeyToLendedNftDetails[_nftKey].lenderAddress==address(0),"NFT is already available for renting");

        // Owner of nft address and lender address must be same
        require(_nftOwner==_lenderAddress,"Non NFT Owner");

        // Due date should be after current time
        require(_dueDate>block.timestamp,"Bad time bounds");

        // Wishlist count of new Nft listed for available for renting should be 0
        require(_wishlistCount==0,"New NFT can't be in any users wishlist yet");

        // Transfer NFT to contract
        // ERC721 nftCollection = ERC721(_nftAddress);
        // nftCollection.safeTransferFrom(_lenderAddress,address(this),_nftId);

        nftProps memory newNFT = nftProps(_nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,_nftImageURL);
        nftKeyToNftProps[_nftKey] = newNFT;
        _lendNFT(_nftKey,_lenderAddress,_dueDate,_dailyRent,_collateral);
    }

    function _lendNFT(
        string memory _nftKey,
        address _lenderAddress,
        uint32 _dueDate,
        uint256 _dailyRent,
        uint256 _collateral
    ) private {
        lendedNFT memory newLend = lendedNFT(_nftKey,_lenderAddress,address(0),_dueDate,_dailyRent,_collateral);
        User storage currentUser = addressToUser[_lenderAddress];
        uint32 lendSize = currentUser.userLendedNftsSize;
        currentUser.userLendedNfts[lendSize] = newLend;
        currentUser.userLendedNftsSize++;

        nftKeyToLendedNftDetails[_nftKey]=newLend;

        nftKeysListAvaiableForRent.push(_nftKey);
        emit NFTLended();
    }

    function rentNft(
        string memory _nftKey,
        address _borrowerAddress,
        uint16 _numberOfDays,
        uint32 _rentalStartTime
    ) external payable {

        // Borrower address should be msg.sender
        require(msg.sender==_borrowerAddress,"Can't borrow NFT for another borrower address");

        // Borrower address should exist in our app
        require(addressToUser[_borrowerAddress].userAddress!=address(0),"User does not exist");

        // NFT should be available for renting i.e must exist in mapping
        //There is no proper way to check if a key already exists or not therefore we are checking for default value i.e., all bits are 0
        require(nftKeyToNftProps[_nftKey].nftAddress!=address(0),"NFT is not available for renting");
        require(nftKeyToLendedNftDetails[_nftKey].lenderAddress!=address(0),"NFT is not available for renting");

        // Rental start time should be less than current time
        require(_rentalStartTime<block.timestamp,"Bad time bounds"); 

        uint32 rentalEndTime = _rentalStartTime + (_numberOfDays*1 days);
        uint32 _dueDate = nftKeyToLendedNftDetails[_nftKey].dueDate;
        require(rentalEndTime<_dueDate,"Can't rent NFT for more than amount of time available for renting");

        uint256 _dailyRent = nftKeyToLendedNftDetails[_nftKey].dailyRent;
        uint256 _collateral = nftKeyToLendedNftDetails[_nftKey].collateral;
        uint256 rentalPayment = _dailyRent*_numberOfDays;
        uint256 totalPayment = rentalPayment + _collateral;

        // Amount to be paid should be greater than or equal to rentalPayment
        require(msg.value>=totalPayment,"Can't rent NFT as insufficient amount paid");

        if (msg.value>totalPayment) {
            // Transfer remaining amount back to his account
            address payable borrowerAddress_ = payable(_borrowerAddress);
            borrowerAddress_.transfer(msg.value-totalPayment);
        }

        // Transfer NFT to the borrower from contract

        // nftProps storage nft_ = nftKeyToNftProps[_nftKey];
        
        // ERC721 nftCollection = ERC721(nft_.nftAddress);
        // nftCollection.safeTransferFrom(address(this),_borrowerAddress,nft_.nftId);
 
        // Transfer rental payment to the lender 

        address payable lenderAddress_ = payable(nftKeyToLendedNftDetails[_nftKey].lenderAddress);
        lenderAddress_.transfer(rentalPayment);

        emit NFTRented();

        // Delete and update mappings 

        // Update borrower in lended user's nft
        address lenderAddress = nftKeyToLendedNftDetails[_nftKey].lenderAddress;
        User storage lender = addressToUser[lenderAddress];
        

        // Add nft in borrower address rented list
        // Remove nft from nfts available for rent
        // Add nft to app's rented nft list 
        
    }

    //nftProps[] nftsAvailableForRent;

    // String is concatenation of nft props 
    // Represents details of nfts available for rent 
    // mapping (string => lendedNFT) nftToLendDetails;

    // function _getNftKey(nftProps memory _nft) public view returns(string memory) {
    //     string memory temp = string(abi.encodePacked(_nft.nftAddress,_nft.nftId));
    //     console.log(temp);
    //     return temp;
    // }

    // function createNFT(address _nftAddress,uint256 _nftId,uint32 _wishlistCount) public pure returns(nftProps memory) {
    //     nftProps memory myStruct = nftProps(_nftAddress,_nftId,_wishlistCount);
    //     return myStruct;
    // }
}