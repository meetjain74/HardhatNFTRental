const { expect } = require('chai');
const { ethers } = require('hardhat');

describe("NFT Rental contract", () => {
    let owner,contract;
    let addr1,addr2;

    beforeEach(async () => {
        // Create the smart contract object to test from
        [owner,addr1,addr2] = await ethers.getSigners();
        const NFTRentalContract = await ethers.getContractFactory("NFTRental");
        contract = await NFTRentalContract.deploy();
    });

    describe("Add user", () => {

        it("Any other user can't add your address to app",async () => {
            await expect(contract.addUser(addr1.address))
            .to.be.revertedWith("Only the user can add his account to app");
        });

        it("Should add user to the users list",async () => {
            await contract.connect(addr1).addUser(addr1.address);
            const userAddressList = await contract.getUserAddressList();
            expect(userAddressList[0]).to.equal(addr1.address);
    
            const user = await contract.connect(addr1).addressToUser(addr1.address);
            expect(user).to.equal(addr1.address);
            // expect(user.userAddress).to.equal(addr1.address);
            // expect(user.userLendedNftsSize).to.equal(0);
            // expect(user.userRentedNftsSize).to.equal(0);
            // expect(user.userWishlistSize).to.equal(0);
        });
    });
    
    describe("Contract Getters", () => {
        
        describe("Getter for User NFT Lended Details", () => {
            let _userAddress;
            let _nftKey;
            // let _index;

            beforeEach(async () => {
                _userAddress = addr1.address;
                _nftKey = "0xcd3b766ccdd6ae721141f452c550ca635964ce718";
                // _index = 0;
            });

            it("User should exist for able to fetch his/her lended NFT details",async () => {
                await expect(contract.connect(addr1).getUserLendedNFTDetails(
                    _userAddress,_nftKey
                ))
                .to.be.revertedWith("User does not exists");
            });

            // it("Index of NFT to be fetched should exist",async () => {
            //     await contract.connect(addr1).addUser(_userAddress);
            //     await expect(contract.connect(addr1).getUserLendedNFTDetails(
            //         _userAddress,_index
            //     ))
            //     .to.be.revertedWith("Nft at the given index does not exist");
            // });

            it("User should have the lended Nft with the key",async () => {
                await contract.connect(addr1).addUser(_userAddress);
                await expect(contract.connect(addr1).getUserLendedNFTDetails(
                    _userAddress,_nftKey
                ))
                .to.be.revertedWith("User does not have any such lended Nft");
            });
        });
    });

    describe("Lending", () => {
        let _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName;
        let _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral;

        beforeEach(async () => {
            _nftKey = "0xcd3b766ccdd6ae721141f452c550ca635964ce718";
            _nftOwner = addr1.address;
            const nftWallet = new ethers.Wallet('0xcd3b766ccdd6ae721141f452c550ca635964ce71');
            _nftAddress = nftWallet.address;
            _nftId = 8;
            _wishlistCount = 0;
            _nftName = "Loki NFT";
            _nftImageURL = "https://hips.hearstapps.com/hmg-prod.s3.amazonaws.com/images/is-loki-alive-1618935098.jpeg";
            _lenderAddress = addr1.address;
            _dueDate = 4294967295; // In Unix timestamp
            _dailyRent = 1000000;
            _collateral = 10000000000000;
        });

        it("Should not lend anyone else's NFT",async ()=> {
            await expect(contract.addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            ))
            .to.be.revertedWith("Can't lend someone else's NFT");
        });

        it("Lender address/NFT Owner should exist",async () => {
            await expect(contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            ))
            .to.be.revertedWith("User does not exist");
        });

        it("NFT should not be rented again",async () => {
            await contract.connect(addr1).addUser(_lenderAddress);
            const response = await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            );

            // Calling same function twice - for nft to be available for renting again
            await expect(contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            ))
            .to.be.revertedWith("NFT is already available for renting");
       });

       it("Wrong NFT owner should not able to lend NFT",async () => {
           _lenderAddress = addr2.address;
           await contract.connect(addr2).addUser(_lenderAddress);
           await expect(contract.connect(addr2).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
           ))
           .to.be.revertedWith("Non NFT Owner");
       });

       it("Due date smaller than today should not be accepted",async () => {
           await contract.connect(addr1).addUser(_lenderAddress);
           _dueDate = 1649500514;
           await expect(contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
           ))
           .to.be.revertedWith("Bad time bounds");
       });

       it("Wishlist count for new NFT made available for renting should be 0",async () => {
            await contract.connect(addr1).addUser(_lenderAddress);
            _wishlistCount = 5;
            await expect(contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
            ))
            .to.be.revertedWith("New NFT can't be in any users wishlist yet");
       });

       it("Should make NFT available for renting",async () => {
           await contract.connect(addr1).addUser(_lenderAddress);
           await contract.connect(addr1).addNFTToLend(
                _nftKey,_nftOwner,_nftAddress,_nftId,_wishlistCount,_nftName,
                _nftImageURL,_lenderAddress,_dueDate,_dailyRent,_collateral
           );

           const nftKeysListAvaiableForRent = await contract.connect(addr1).getNftKeysListAvaiableForRent();
           expect(nftKeysListAvaiableForRent[0]).to.equal(_nftKey);

           // Check mapping nftKeyToNftProps
           const nft = await contract.connect(addr1).nftKeyToNftProps(_nftKey);
           expect(nft.nftKey).to.equal(_nftKey);
           expect(nft.nftOwner).to.equal(_nftOwner);
           expect(nft.nftAddress).to.equal(_nftAddress);
           expect(nft.wishlistCount).to.equal(_wishlistCount);
           expect(nft.nftName).to.equal(_nftName);
           expect(nft.nftImageURL).to.equal(_nftImageURL);

           // Get user from address
           const user = await contract.connect(addr1).addressToUser(_lenderAddress);
           expect(user).to.equal(_lenderAddress);
        //    expect(user.userAddress).to.equal(_lenderAddress);
        //    expect(user.userLendedNftsSize).to.equal(1);
        //    expect(user.userRentedNftsSize).to.equal(0);
        //    expect(user.userWishlistSize).to.equal(0);

           const lendedNftDetails = await contract.connect(addr1).getUserLendedNFTDetails(_lenderAddress,_nftKey);
           expect(lendedNftDetails.nftKey).to.equal(_nftKey);
           expect(lendedNftDetails.lenderAddress).to.equal(_lenderAddress);
           expect(lendedNftDetails.borrowerAddress).to.equal("0x0000000000000000000000000000000000000000");
           expect(lendedNftDetails.dueDate).to.equal(_dueDate);
           expect(lendedNftDetails.dailyRent).to.equal(_dailyRent);
           expect(lendedNftDetails.collateral).to.equal(_collateral);

           // Check mapping nftKeyToLendedNftDetails
           const lendedNft = await contract.connect(addr1).nftKeyToLendedNftDetails(_nftKey);
           expect(lendedNft.nftKey).to.equal(_nftKey);
           expect(lendedNft.lenderAddress).to.equal(_lenderAddress);
           expect(lendedNft.borrowerAddress).to.equal("0x0000000000000000000000000000000000000000");
           expect(lendedNft.dueDate).to.equal(_dueDate);
           expect(lendedNft.dailyRent).to.equal(_dailyRent);
           expect(lendedNft.collateral).to.equal(_collateral);
       });
    });

    describe("Renting", () => {
        let _nftKey,_borrowerAddress,_numberOfDays,_rentalStartTime;

        beforeEach(async () => {
            _nftKey = "0xcd3b766ccdd6ae721141f452c550ca635964ce718";
            _borrowerAddress = addr1.address;
            _numberOfDays = 5;
            _rentalStartTime = 4294967295; // Some future time (in unix timestamp)
        });

        
    });

    // it ("Address in string check1", async () => {
    //     const addr = '0xcd3b766ccdd6ae721141f452c550ca635964ce71';
    //     console.log(addr);
    //     await contract.addUser(addr);
    //     const userAddressList = await contract.getUserAddressList();
    //     expect(userAddressList[0]).to.equal(addr);
    //     // Successfully passes address to solidity but gives assertion error (due to checksum error)
    // });

    // it ("Address in string check2", async () => {
    //     const Web3 = require('web3');
    //     const web3 = new Web3(Web3.givenProvider);
    //     const addr = Web3.utils.toChecksumAddress('0xcd3b766ccdd6ae721141f452c550ca635964ce71');
    //     await contract.addUser(addr);
    //     const userAddressList = await contract.getUserAddressList();
    //     expect(userAddressList[0]).to.equal(addr);
    // });

    // it ("Address in string check3", async () => {
    //     const addrWallet = new ethers.Wallet('0xcd3b766ccdd6ae721141f452c550ca635964ce71');
    //     await contract.addUser(addrWallet.address);
    //     const userAddressList = await contract.getUserAddressList();
    //     expect(userAddressList[0]).to.equal(addrWallet.address);
    // });
});