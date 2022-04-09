const { ethers } = require("hardhat");

 async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contracts with the account: ${deployer.address}`);

    const balance =await deployer.getBalance();
    console.log(`Account balance: ${balance.toString()}`);

    const NFTRentalContract = await ethers.getContractFactory("NFTRental");
    const contract = await NFTRentalContract.deploy();
    console.log(`Token address: ${contract.address}`);
 } 

 main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
