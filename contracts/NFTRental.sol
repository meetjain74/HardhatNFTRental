// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract NFTRental is ERC721Holder {

    // constructor() ERC721("NFTRental", "MVVT") { }

    // Structure for storing nft properties
    struct nftProps {
        string nftKey; // Key is unique string and concatenation of nftAddress and nftId

        address nftOwner;
        address nftAddress;
        uint256 nftId;

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

        // String for mappings is nftKey
        mapping (string => lendedNFT) userLendedNfts;
        string[] userLendedNftsList;

        mapping (string => rentedNFT) userRentedNfts;
        string[] userRentedNftsList;

        mapping (string => lendedNFT) userWishlist;
        string[] userWishlistList;
    }

    // Address of all the users of the app
    address[] private userAddressList;

    // Mapping of user address to user details
    mapping (address => User) public addressToUser;

    // Key strings of nfts available to rent on app
    string[] private nftKeysListAvaiableForRent;

    // Mapping of above nft key to nftProps
    mapping (string => nftProps) public nftKeyToNftProps;

    // Mapping of nft key to lended nft details
    mapping (string => lendedNFT) public nftKeyToLendedNftDetails;

    // Mapping of nft key to rented nft details - those nfts which users have took on rent
    mapping (string => rentedNFT) public nftKeyToRentedNftDetails;

    // Events
    event NFTLended(); 
    event NFTRented();
    event NFTStopLended();
    event NFTCollateralClaimed();
    event NFTReturned();

    function getContractBalance() external view returns(uint) {
        return address(this).balance;
    }

    function getUserAddressList() public view returns(address[] memory) {
        return userAddressList;
    }

    function getNftKeysListAvaiableForRent() public view returns(string[] memory) {
        return nftKeysListAvaiableForRent;
    }

    function getUserLendedNFTDetails(address _userAddress,string memory _nftKey) public view returns(lendedNFT memory) {
        // Should not be a zero address
        require(_userAddress!=address(0),"Invalid address");

        User storage user = addressToUser[_userAddress];

        // User should exist
        require(user.userAddress!=address(0),"User does not exists");

        // The nft _nftKey should exist in user lended NFTs
        require(user.userLendedNfts[_nftKey].lenderAddress!=address(0),"User does not have any such lended Nft");

        return user.userLendedNfts[_nftKey];
    }

    function getUserLendedNFTListDetails(address _userAddress,uint _index) public view returns(string memory) {
        // Should not be a zero address
        require(_userAddress!=address(0),"Invalid address");

        User storage user = addressToUser[_userAddress];

        // User should exist
        require(user.userAddress!=address(0),"User does not exists");

        // Index should be less than userLendedNftsList size
        require(_index<user.userLendedNftsList.length,"Nft at the given index does not exist");

        return user.userLendedNftsList[_index];
    }

    function getUserRentedNFTDetails(address _userAddress,string memory _nftKey) public view returns(rentedNFT memory) {
        // Should not be a zero address
        require(_userAddress!=address(0),"Invalid address");

        User storage user = addressToUser[_userAddress];

        // User should exist
        require(user.userAddress!=address(0),"User does not exists");

        // The nft _nftKey should exist in user rented NFTs
        require(user.userRentedNfts[_nftKey].borrowerAddress!=address(0),"User does not have any such rented Nft");

        return user.userRentedNfts[_nftKey];
    }

    function getUserRentedNFTListDetails(address _userAddress,uint _index) public view returns(string memory) {
        // Should not be a zero address
        require(_userAddress!=address(0),"Invalid address");

        User storage user = addressToUser[_userAddress];

        // User should exist
        require(user.userAddress!=address(0),"User does not exists");

        // Index should be less than userRentedNftsList size
        require(_index<user.userRentedNftsList.length,"Nft at the given index does not exist");

        return user.userRentedNftsList[_index];
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
            userAddressList.push(_userAddress);
        }
    }

    // Main lend function called by frontend
    function addNFTToLend(
        string memory _nftKey,
        address _nftOwner,
        address _nftAddress,
        uint256 _nftId, 
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

        // Transfer NFT to contract
        // ERC721 nftCollection = ERC721(_nftAddress);
        // nftCollection.safeTransferFrom(_lenderAddress,address(this),_nftId);

        nftProps memory newNFT = nftProps(_nftKey,_nftOwner,_nftAddress,_nftId,_nftName,_nftImageURL);
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
        // uint32 lendSize = currentUser.userLendedNftsSize;
        currentUser.userLendedNfts[_nftKey] = newLend;
        currentUser.userLendedNftsList.push(_nftKey);
        // currentUser.userLendedNftsSize++;

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
        _checkParamters(_nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime);
        
        uint256 _dailyRent = nftKeyToLendedNftDetails[_nftKey].dailyRent;
        uint256 _collateral = nftKeyToLendedNftDetails[_nftKey].collateral;
        uint256 rentalPayment = _dailyRent*_numberOfDays;
        uint256 totalPayment = rentalPayment + _collateral;

        // Amount to be paid should be greater than or equal to rentalPayment
        require(msg.value>=totalPayment,"Can't rent NFT as insufficient amount paid");

        // // Borrower address of the nft to be rented should be address(0) 
        // This will always be true because we are deleting the mapping
        // require(nftKeyToLendedNftDetails[_nftKey].borrowerAddress==address(0),"NFT already rented by someone else");

        address lenderAddress = nftKeyToLendedNftDetails[_nftKey].lenderAddress;

        // Delete and update mappings 
        _deleteAndUpdateMappings(_nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime);

        // Payment

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

        address payable lenderAddress_ = payable(lenderAddress);
        lenderAddress_.transfer(rentalPayment);

        emit NFTRented();
    }

    function _checkParamters(
        string memory _nftKey,
        address _borrowerAddress,
        uint16 _numberOfDays,
        uint32 _rentalStartTime
    ) private view {
        // Borrower address should be msg.sender
        require(msg.sender==_borrowerAddress,"Can't borrow NFT for another borrower address");

        // Borrower address should exist in our app
        require(addressToUser[_borrowerAddress].userAddress!=address(0),"User does not exist");

        nftProps storage nft_ = nftKeyToNftProps[_nftKey];

        // NFT should be available for renting i.e must exist in mapping
        //There is no proper way to check if a key already exists or not therefore we are checking for default value i.e., all bits are 0
        require(nft_.nftAddress!=address(0),"NFT is not available for renting");
        require(nftKeyToLendedNftDetails[_nftKey].lenderAddress!=address(0),"NFT is not available for renting");

        // Rental start time should be less than current time
        require(_rentalStartTime<block.timestamp,"Bad time bounds");

        uint32 rentalEndTime = _rentalStartTime + (uint32(_numberOfDays)*1 days);
        uint32 _dueDate = nftKeyToLendedNftDetails[_nftKey].dueDate;
        require(rentalEndTime<_dueDate,"Can't rent NFT for more than amount of time available for renting");
    }

    function _deleteAndUpdateMappings(
        string memory _nftKey,
        address _borrowerAddress,
        uint16 _numberOfDays,
        uint32 _rentalStartTime
    ) private {
        // Update borrower in lended user's nft
        address lenderAddress = nftKeyToLendedNftDetails[_nftKey].lenderAddress;

        // Lender should not be the borrower
        require(lenderAddress!=_borrowerAddress,"Borrower address can't be the same as lender address");

        User storage lender = addressToUser[lenderAddress];
        require(lender.userLendedNfts[_nftKey].borrowerAddress==address(0),"NFT already rented by someone else");
        lender.userLendedNfts[_nftKey].borrowerAddress = _borrowerAddress;

        // Add nft in borrower address rented list 

        rentedNFT memory newRentedNft = rentedNFT(_nftKey,lenderAddress,_borrowerAddress,_numberOfDays,_rentalStartTime);
        User storage renter = addressToUser[_borrowerAddress];

        // Nft should not be already in user rented Nfts
        // rentedNFT storage rentedNft_ = ;
        require(renter.userRentedNfts[_nftKey].borrowerAddress==address(0),"Nft is already present in user rented Nfts");
        renter.userRentedNfts[_nftKey] = newRentedNft;
        renter.userRentedNftsList.push(_nftKey);

        // Add nft to app's rented nft list 

        require(nftKeyToRentedNftDetails[_nftKey].borrowerAddress==address(0),"Nft is already present in user rented Nfts");
        nftKeyToRentedNftDetails[_nftKey] = newRentedNft;

        // Remove nft from nfts available for rent

        uint _nftKeyIndex = _getElementIndex(_nftKey);
        _deleteElementAtIndex(_nftKeyIndex);
        delete nftKeyToLendedNftDetails[_nftKey];
    }

    function _getElementIndex(string memory _element) private view returns(uint) {
        uint len = nftKeysListAvaiableForRent.length;
        for (uint i=0;i<len;i++) {
            if (keccak256(abi.encodePacked(_element))==keccak256(abi.encodePacked(nftKeysListAvaiableForRent[i]))) {
                return i;
            }
        }
        return len;
    }

    function _deleteElementAtIndex(uint _index) private {
        require(_index<nftKeysListAvaiableForRent.length,"Nft key not available in the app renting list");

        uint _lastIndex = nftKeysListAvaiableForRent.length-1;
        nftKeysListAvaiableForRent[_index] = nftKeysListAvaiableForRent[_lastIndex];
        nftKeysListAvaiableForRent.pop();
    }

    // Called by lender
    function stopLend(string memory _nftKey) external {

        // Msg sender should exists
        User storage user = addressToUser[msg.sender];
        require(user.userAddress!=address(0),"User does not exists");

        nftProps storage nft_ = nftKeyToNftProps[_nftKey];
        // uint tokenId = nft_.nftId;

        // Nft should be available in app
        require(nft_.nftAddress!=address(0),"NFT is not available");

        // Nft should not be already rented
        lendedNFT storage lendNft_ = nftKeyToLendedNftDetails[_nftKey];
        require(lendNft_.lenderAddress!=address(0),"NFT is already rented");
        require(lendNft_.borrowerAddress==address(0),"NFT is already rented");

        // Msg sender should be lender address
        require(lendNft_.lenderAddress==msg.sender,"Can't stop lend someone else's NFT");

        // Contract should be the current owner of the nft
        // ERC721 nftCollection = ERC721(nft_.nftAddress);
        // require(nftCollection.ownerOf(tokenId)==address(this),"Contract is not the owner of NFT");

        // User should have that nft as lend
        require(user.userLendedNfts[_nftKey].lenderAddress==msg.sender,"User does not have any such NFTs as lend");

        // Delete mappings

        // Remove nft from nfts available for rent
        uint _nftKeyIndex = _getElementIndex(_nftKey);
        _deleteElementAtIndex(_nftKeyIndex);
        delete nftKeyToLendedNftDetails[_nftKey];

        // Remove from app's nft available mapping
        delete nftKeyToNftProps[_nftKey];

        // Remove from user's lended nfts mapping and list
        uint _nftKeyUserLendedIndex = _getUserLendedListElementIndex(_nftKey, user);
        _deleteElementAtUserLendedListIndex(_nftKeyUserLendedIndex, user);
        delete user.userLendedNfts[_nftKey];

        // Transfer Nft to lender address
        // nftCollection.safeTransferFrom(address(this), msg.sender, tokenId);

        emit NFTStopLended();
    }

    function _getUserLendedListElementIndex(string memory _element, User storage user) private view returns(uint) {
        uint len = user.userLendedNftsList.length;
        for (uint i=0;i<len;i++) {
            if (keccak256(abi.encodePacked(_element))==keccak256(abi.encodePacked(user.userLendedNftsList[i]))) {
                return i;
            }
        }
        return len;
    }

    function _deleteElementAtUserLendedListIndex(uint _index, User storage user) private {
        require(_index<user.userLendedNftsList.length,"Nft key not available in the app renting list");

        uint _lastIndex = user.userLendedNftsList.length-1;
        user.userLendedNftsList[_index] = user.userLendedNftsList[_lastIndex];
        user.userLendedNftsList.pop();
    }

    // Called by lender
    function claimCollateral(string memory _nftKey) external {

        // Msg sender should exists
        User storage lender = addressToUser[msg.sender];
        require(lender.userAddress!=address(0),"Lender does not exist");

        nftProps storage nft_ = nftKeyToNftProps[_nftKey];

        // Nft should be available in app
        require(nft_.nftAddress!=address(0),"NFT is not available");

        // Nft should be already rented
        lendedNFT storage lendNft_ = nftKeyToLendedNftDetails[_nftKey];
        require(lendNft_.lenderAddress==address(0),"NFT is not rented");

        rentedNFT storage rentNft_ = nftKeyToRentedNftDetails[_nftKey];
        require(rentNft_.borrowerAddress!=address(0),"NFT is not rented");

        User storage borrower = addressToUser[rentNft_.borrowerAddress];
        require(borrower.userAddress!=address(0),"Borrower does not exist");

        // User should have that nft as lend
        lendedNFT storage userLendNft_ = lender.userLendedNfts[_nftKey];
        require(userLendNft_.lenderAddress==msg.sender,"User does not have any such NFTs as lend");

        // Time at function call should be greater than end time of rented nft
        uint _rentalStartTime = rentNft_.rentalStartTime;
        uint _numberOfDays = rentNft_.numberOfDays;
        uint _rentalEndTime = _rentalStartTime + (uint32(_numberOfDays)*1 days);
        require(_rentalEndTime < block.timestamp, "Can't claim collateral till rented end time");

        uint collateral = userLendNft_.collateral;

        // Delete mappings

        // Delete nft from app rented Nfts
        delete nftKeyToRentedNftDetails[_nftKey];

        // Delete nft from app
        delete nftKeyToNftProps[_nftKey];

        // Delete nft from lender's lended nfts mapping and list
        uint _nftKeyUserLendedIndex = _getUserLendedListElementIndex(_nftKey, lender);
        _deleteElementAtUserLendedListIndex(_nftKeyUserLendedIndex, lender);
        delete lender.userLendedNfts[_nftKey];

        // Delete nft from borrower's rented nfts mapping and list
        uint _nftKeyUserRentedIndex = _getUserRentedListElementIndex(_nftKey, borrower);
        _deleteElementAtUserRentedListIndex(_nftKeyUserRentedIndex, borrower);
        delete borrower.userRentedNfts[_nftKey];

        // Pay collateral to lender
        address payable lenderAddress = payable(lender.userAddress);
        lenderAddress.transfer(collateral);

        emit NFTCollateralClaimed();
    }

    function _getUserRentedListElementIndex(string memory _element, User storage user) private view returns(uint) {
        uint len = user.userRentedNftsList.length;
        for (uint i=0;i<len;i++) {
            if (keccak256(abi.encodePacked(_element))==keccak256(abi.encodePacked(user.userRentedNftsList[i]))) {
                return i;
            }
        }
        return len;
    }

    function _deleteElementAtUserRentedListIndex(uint _index, User storage user) private {
        require(_index<user.userRentedNftsList.length,"Nft key not available in the app renting list");

        uint _lastIndex = user.userRentedNftsList.length-1;
        user.userRentedNftsList[_index] = user.userRentedNftsList[_lastIndex];
        user.userRentedNftsList.pop();
    }

    // Called by borrower
    function returnNFT(string memory _nftKey) external {
        _returnNFTChecks(_nftKey);

        User storage borrower = addressToUser[msg.sender];
        rentedNFT storage rentNft_ = nftKeyToRentedNftDetails[_nftKey];
        User storage lender = addressToUser[rentNft_.lenderAddress];
        
        //nftProps storage nft_ = nftKeyToNftProps[_nftKey];
        //uint tokenId = nft_.nftId;

        lendedNFT storage userLendNft_ = lender.userLendedNfts[_nftKey];
        uint collateral = userLendNft_.collateral;

        address lenderAddress = lender.userAddress;
        address payable borrowerAddress = payable(borrower.userAddress);

        // Delete and update mappings
        
        // remove nft from app rented nfts
        delete nftKeyToRentedNftDetails[_nftKey];

        // remove nft from borrower rented nfts
        uint _nftKeyUserRentedIndex = _getUserRentedListElementIndex(_nftKey, borrower);
        _deleteElementAtUserRentedListIndex(_nftKeyUserRentedIndex, borrower);
        delete borrower.userRentedNfts[_nftKey];

        uint32 dueDate = userLendNft_.dueDate;

        // before due date has passed
        if (block.timestamp < dueDate) {
            // set borrower address lender lended nfts to address 0 
            userLendNft_.borrowerAddress = address(0);

            // Add nft in app lended NFT - Nft again for lend
            lendedNFT memory newNft = lendedNFT(_nftKey,lenderAddress,address(0),dueDate,userLendNft_.dailyRent,collateral);
            nftKeyToLendedNftDetails[_nftKey] = newNft;
            nftKeysListAvaiableForRent.push(_nftKey);

            // Transfer NFT to contract - Contract should be approved first
            // ERC721 nftCollection = ERC721(nft_.nftAddress);
            // nftCollection.safeTransferFrom(borrowerAddress,address(this),tokenId);
        } 
        
        // after due date has passed
        else {
            // Delete nft from lender's lended nfts mapping and list
            uint _nftKeyUserLendedIndex = _getUserLendedListElementIndex(_nftKey, lender);
            _deleteElementAtUserLendedListIndex(_nftKeyUserLendedIndex, lender);
            delete lender.userLendedNfts[_nftKey];

            // Delete nft from app
            delete nftKeyToNftProps[_nftKey]; 

            // Transfer NFT to lender - Contract should be approved first
            // ERC721 nftCollection = ERC721(nft_.nftAddress);
            // nftCollection.safeTransferFrom(borrowerAddress,lenderAddress,tokenId);
        }

        // Transfer collateral to borrower
        borrowerAddress.transfer(collateral);

        emit NFTReturned();
    }

    function _returnNFTChecks(string memory _nftKey) private view {
        // Msg sender should exists
        User storage borrower = addressToUser[msg.sender];
        require(borrower.userAddress!=address(0),"User does not exists");

        nftProps storage nft_ = nftKeyToNftProps[_nftKey];

        // Nft should be available in app
        require(nft_.nftAddress!=address(0),"NFT is not available");

        // Nft should be already rented
        lendedNFT storage lendNft_ = nftKeyToLendedNftDetails[_nftKey];
        require(lendNft_.lenderAddress==address(0),"NFT is not rented");

        rentedNFT storage rentNft_ = nftKeyToRentedNftDetails[_nftKey];
        require(rentNft_.borrowerAddress!=address(0),"NFT is not rented");

        User storage lender = addressToUser[rentNft_.lenderAddress];
        require(lender.userAddress!=address(0),"Lender does not exist");

        // User should have that nft as rent
        rentedNFT storage userRentNft_ = borrower.userRentedNfts[_nftKey];
        require(userRentNft_.borrowerAddress==msg.sender,"User does not have any such NFTs as rent");
    }
}