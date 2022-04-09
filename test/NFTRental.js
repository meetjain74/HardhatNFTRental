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
        //console.log(contract);
    });

    it("Should add user to the users list",async () => {
        await contract.addUser(addr1.address);
        const userAddressList = await contract.getUserAddressList();
        expect(userAddressList[0]).to.equal(addr1.address);

        const user = await contract.addressToUser(addr1.address);
        expect(user.userAddress).to.equal(addr1.address);
        expect(user.userLendedNftsSize).to.equal(0);
        expect(user.userRentedNftsSize).to.equal(0);
        expect(user.userWishListSize).to.equal(0);
    });

    describe("Lending", () => {
        
        it("Check working of Lend NFT",async () => {

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