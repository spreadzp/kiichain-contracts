import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { arrayifyPublicKey, base64ToBytes, bytesToBase64, fromBase64ToPublicKey, generateKeyPair, hexToBytes, publicKeyToBase64 } from "../scripts/forge";
import { encryptByCJ, getNewAccount } from "../scripts/cypher";

describe("RWAValuation", function () {
    // We define a fixture to reuse the same setup in every test.
    async function deployRWAValuationFixture() {
        const validators = [
            (await hre.ethers.getSigners())[1].address,
            (await hre.ethers.getSigners())[2].address,
            (await hre.ethers.getSigners())[3].address,
            (await hre.ethers.getSigners())[4].address,
            (await hre.ethers.getSigners())[5].address,
        ];

        // Contracts are deployed using the first signer/account by default
        const [admin, validator1, validator2, validator3, validator4, validator5, otherAccount] = await hre.ethers.getSigners();

        const RWAValuation = await hre.ethers.getContractFactory("RwaValuation");
        const rwaValuation = await RWAValuation.deploy(validators, admin.address);

        const RwaToken = await hre.ethers.getContractFactory("RwaToken");
        const rwaToken = await RwaToken.deploy("Real World Asset Token", "RWA");
        const rwaTokenAddress = await rwaToken.getAddress()

        return { rwaValuation, rwaToken, validators, admin, validator1, validator2, validator3, validator4, validator5, otherAccount, rwaTokenAddress };
    }

    describe("Deployment", function () {
        it("Should set the right validators", async function () {
            const { rwaValuation, validators } = await loadFixture(deployRWAValuationFixture);

            expect(await rwaValuation.getValidators()).to.deep.equal(validators);
        });

        it("Should set the right admin", async function () {
            const { rwaValuation, admin } = await loadFixture(deployRWAValuationFixture);

            expect(await rwaValuation.admin()).to.equal(admin.address);
        });
    });

    describe("Evaluation", function () {
        it("Should allow validators to evaluate an RWA", async function () {
            const { rwaValuation, rwaTokenAddress, validator1, validator2, validator3, validator4, validator5, admin } = await loadFixture(deployRWAValuationFixture);
            const nftId = 1;
            const publicKey = "0x1234"; // Example public key
            const valuation1 = '100';
            const valuation2 = '200';
            const valuation3 = '300';
            const valuation4 = '400';
            const valuation5 = '500';

            await rwaValuation.connect(admin).setUpRwaToValuate(nftId, publicKey, rwaTokenAddress);
            await rwaValuation.connect(validator1).evaluateRwa(nftId, valuation1, rwaTokenAddress);
            await rwaValuation.connect(validator2).evaluateRwa(nftId, valuation2, rwaTokenAddress);
            await rwaValuation.connect(validator3).evaluateRwa(nftId, valuation3, rwaTokenAddress);
            await rwaValuation.connect(validator4).evaluateRwa(nftId, valuation4, rwaTokenAddress);
            await rwaValuation.connect(validator5).evaluateRwa(nftId, valuation5, rwaTokenAddress);

            expect(await rwaValuation.getEncodedValuation(nftId, validator1.address, rwaTokenAddress)).to.equal(valuation1);
            expect(await rwaValuation.getEncodedValuation(nftId, validator2.address, rwaTokenAddress)).to.equal(valuation2);
            expect(await rwaValuation.getEncodedValuation(nftId, validator3.address, rwaTokenAddress)).to.equal(valuation3);
            expect(await rwaValuation.getEncodedValuation(nftId, validator4.address, rwaTokenAddress)).to.equal(valuation4);
            expect(await rwaValuation.getEncodedValuation(nftId, validator5.address, rwaTokenAddress)).to.equal(valuation5);
        });

        it("Should emit Evaluated event on evaluation", async function () {
            const { rwaValuation, rwaTokenAddress, validator1, admin } = await loadFixture(deployRWAValuationFixture);
            const nftId = 1;
            const publicKey = "0x1234"; // Example public key
            const valuation = '100';

            await rwaValuation.connect(admin).setUpRwaToValuate(nftId, publicKey, rwaTokenAddress);
            await expect(rwaValuation.connect(validator1).evaluateRwa(nftId, valuation, rwaTokenAddress))
                .to.emit(rwaValuation, "Evaluated")
                .withArgs(rwaTokenAddress, nftId, validator1.address, valuation);
        });

        it("Should revert if a validator tries to evaluate the same NFT twice", async function () {
            const { rwaValuation, rwaTokenAddress, validator1, admin } = await loadFixture(deployRWAValuationFixture);
            const nftId = 1;
            const publicKey = "0x1234"; // Example public key
            const valuation = '100';

            await rwaValuation.connect(admin).setUpRwaToValuate(nftId, publicKey, rwaTokenAddress);
            await rwaValuation.connect(validator1).evaluateRwa(nftId, valuation, rwaTokenAddress);

            await expect(rwaValuation.connect(validator1).evaluateRwa(nftId, valuation, rwaTokenAddress))
                .to.be.revertedWith("You have already evaluated this NFT.");
        });

        it("Should revert if a non-validator tries to evaluate an RWA", async function () {
            const { rwaValuation, rwaTokenAddress, otherAccount } = await loadFixture(deployRWAValuationFixture);
            const nftId = 1;
            const valuation = '100';

            await expect(rwaValuation.connect(otherAccount).evaluateRwa(nftId, valuation, rwaTokenAddress))
                .to.be.revertedWith("You are not a validator.");
        });
    });

    describe("Ratings Calculation", function () {
        it("Should calculate ratings correctly when all validators have evaluated", async function () {
            const { rwaValuation, rwaTokenAddress, validator1, validator2, validator3, validator4, validator5, admin } = await loadFixture(deployRWAValuationFixture);
            const nftId = 1;
            const publicKey = "0x1234"; // Example public key
            const privateKey = "0x5678"; // Example private key
            const valuation1 = '100';
            const valuation2 = '200';
            const valuation3 = '300';
            const valuation4 = '400';
            const valuation5 = '900';

            await rwaValuation.connect(admin).setUpRwaToValuate(nftId, publicKey, rwaTokenAddress);
            await rwaValuation.connect(validator1).evaluateRwa(nftId, valuation1, rwaTokenAddress);
            await rwaValuation.connect(validator2).evaluateRwa(nftId, valuation2, rwaTokenAddress);
            await rwaValuation.connect(validator3).evaluateRwa(nftId, valuation3, rwaTokenAddress);
            await rwaValuation.connect(validator4).evaluateRwa(nftId, valuation4, rwaTokenAddress);
            await rwaValuation.connect(validator5).evaluateRwa(nftId, valuation5, rwaTokenAddress);

            const validators = [validator1.address, validator2.address, validator3.address, validator4.address, validator5.address];
            const decodedValuations = [valuation1, valuation2, valuation3, valuation4, valuation5];

            await rwaValuation.connect(admin).setDecodedValuation(nftId, validators, decodedValuations, privateKey, rwaTokenAddress);
            await rwaValuation.connect(admin).calculateRatings(nftId, rwaTokenAddress);

            // Since all validators have evaluated, ratings should be calculated
            expect(await rwaValuation.validatorRatings(validator1.address)).to.equal(1);
            expect(await rwaValuation.validatorRatings(validator2.address)).to.equal(5);
            expect(await rwaValuation.validatorRatings(validator3.address)).to.equal(10);
            expect(await rwaValuation.validatorRatings(validator4.address)).to.equal(10);
            expect(await rwaValuation.validatorRatings(validator5.address)).to.equal(1);
        });
    });

    describe("Average Valuation", function () {
        it("Should return the correct average valuation for an NFT", async function () {
            const { rwaValuation, rwaTokenAddress, validator1, validator2, validator3, validator4, validator5, admin } = await loadFixture(deployRWAValuationFixture);
            const nftId = 1;
            const publicKey = "0x1234"; // Example public key
            const privateKey = "0x5678"; // Example private key
            const valuation1 = '100';
            const valuation2 = '200';
            const valuation3 = '300';
            const valuation4 = '400';
            const valuation5 = '500';

            await rwaValuation.connect(admin).setUpRwaToValuate(nftId, publicKey, rwaTokenAddress);
            await rwaValuation.connect(validator1).evaluateRwa(nftId, valuation1, rwaTokenAddress);
            await rwaValuation.connect(validator2).evaluateRwa(nftId, valuation2, rwaTokenAddress);
            await rwaValuation.connect(validator3).evaluateRwa(nftId, valuation3, rwaTokenAddress);
            await rwaValuation.connect(validator4).evaluateRwa(nftId, valuation4, rwaTokenAddress);
            await rwaValuation.connect(validator5).evaluateRwa(nftId, valuation5, rwaTokenAddress);

            const validators = [validator1.address, validator2.address, validator3.address, validator4.address, validator5.address];
            const decodedValuations = [valuation1, valuation2, valuation3, valuation4, valuation5];

            await rwaValuation.connect(admin).setDecodedValuation(nftId, validators, decodedValuations, privateKey, rwaTokenAddress);

            const averageValuation = (Number(valuation1) + Number(valuation2) + Number(valuation3) + Number(valuation4) + Number(valuation5)) / 5;
            expect(await rwaValuation.getAverageValuation(nftId, rwaTokenAddress)).to.equal(averageValuation);
        });

        it("Should revert if no evaluations exist for an NFT", async function () {
            const { rwaValuation, rwaTokenAddress } = await loadFixture(deployRWAValuationFixture);
            const nftId = 1;

            await expect(rwaValuation.getAverageValuation(nftId, rwaTokenAddress))
                .to.be.revertedWith("No evaluations for this NFT");
        });
    });

    describe("Admin Functions", function () {
        it("Should allow the admin to set up a new admin", async function () {
            const { rwaValuation, admin, otherAccount } = await loadFixture(deployRWAValuationFixture);

            await rwaValuation.connect(admin).setupNewAdmin(otherAccount.address);
            expect(await rwaValuation.admin()).to.equal(otherAccount.address);
        });

        it("Should revert if a non-admin tries to set up a new admin", async function () {
            const { rwaValuation, otherAccount } = await loadFixture(deployRWAValuationFixture);

            await expect(rwaValuation.connect(otherAccount).setupNewAdmin(otherAccount.address))
                .to.be.revertedWith("You are not the admin.");
        });

        it("Should allow the admin to add a new validator", async function () {
            const { rwaValuation, admin, otherAccount } = await loadFixture(deployRWAValuationFixture);

            await rwaValuation.connect(admin).addValidator(otherAccount.address);
            expect(await rwaValuation.isValidator(otherAccount.address)).to.be.true;
        });

        it("Should revert if a non-admin tries to add a new validator", async function () {
            const { rwaValuation, otherAccount } = await loadFixture(deployRWAValuationFixture);

            await expect(rwaValuation.connect(otherAccount).addValidator(otherAccount.address))
                .to.be.revertedWith("You are not the admin.");
        });

        it("Should allow the admin to remove a validator", async function () {
            const { rwaValuation, admin, validator1 } = await loadFixture(deployRWAValuationFixture);

            await rwaValuation.connect(admin).removeValidator(validator1.address);
            expect(await rwaValuation.isValidator(validator1.address)).to.be.false;
        });

        it("Should revert if a non-admin tries to remove a validator", async function () {
            const { rwaValuation, otherAccount, validator1 } = await loadFixture(deployRWAValuationFixture);

            await expect(rwaValuation.connect(otherAccount).removeValidator(validator1.address))
                .to.be.revertedWith("You are not the admin.");
        });
    });

    describe("Event Tests", function () {
        it("Should emit SetupRwaToEvaluate event", async function () {
            const { rwaValuation, rwaTokenAddress, admin } = await loadFixture(deployRWAValuationFixture);
            const nftId = 1;
            const publicKey = "0x1234"; // Example public key

            await expect(rwaValuation.connect(admin).setUpRwaToValuate(nftId, publicKey, rwaTokenAddress))
                .to.emit(rwaValuation, "SetupRwaToEvaluate")
                .withArgs(rwaTokenAddress, nftId);
        });

        it("Should emit FinishEvaluated event", async function () {
            const { rwaValuation, rwaTokenAddress, validator1, validator2, validator3, validator4, validator5, admin } = await loadFixture(deployRWAValuationFixture);
            const nftId = 1;
            const publicKey = "0x1234"; // Example public key
            const valuation1 = '100';
            const valuation2 = '200';
            const valuation3 = '300';
            const valuation4 = '400';
            const valuation5 = '500';

            await rwaValuation.connect(admin).setUpRwaToValuate(nftId, publicKey, rwaTokenAddress);
            await rwaValuation.connect(validator1).evaluateRwa(nftId, valuation1, rwaTokenAddress);
            await rwaValuation.connect(validator2).evaluateRwa(nftId, valuation2, rwaTokenAddress);
            await rwaValuation.connect(validator3).evaluateRwa(nftId, valuation3, rwaTokenAddress);
            await rwaValuation.connect(validator4).evaluateRwa(nftId, valuation4, rwaTokenAddress);

            await expect(rwaValuation.connect(validator5).evaluateRwa(nftId, valuation5, rwaTokenAddress))
                .to.emit(rwaValuation, "FinishEvaluated")
                .withArgs(rwaTokenAddress, nftId);
        });

        it("Should emit RwaEvaluated event", async function () {
            const { rwaValuation, rwaTokenAddress, validator1, validator2, validator3, validator4, validator5, admin } = await loadFixture(deployRWAValuationFixture);
            const nftId = 1;
            const publicKey = "0x1234"; // Example public key
            const privateKey = "0x5678"; // Example private key
            const valuation1 = '100';
            const valuation2 = '200';
            const valuation3 = '300';
            const valuation4 = '400';
            const valuation5 = '500';

            await rwaValuation.connect(admin).setUpRwaToValuate(nftId, publicKey, rwaTokenAddress);
            await rwaValuation.connect(validator1).evaluateRwa(nftId, valuation1, rwaTokenAddress);
            await rwaValuation.connect(validator2).evaluateRwa(nftId, valuation2, rwaTokenAddress);
            await rwaValuation.connect(validator3).evaluateRwa(nftId, valuation3, rwaTokenAddress);
            await rwaValuation.connect(validator4).evaluateRwa(nftId, valuation4, rwaTokenAddress);
            await rwaValuation.connect(validator5).evaluateRwa(nftId, valuation5, rwaTokenAddress);

            const validators = [validator1.address, validator2.address, validator3.address, validator4.address, validator5.address];
            const decodedValuations = [valuation1, valuation2, valuation3, valuation4, valuation5];

            await rwaValuation.connect(admin).setDecodedValuation(nftId, validators, decodedValuations, privateKey, rwaTokenAddress);

            const averageValuation = (Number(valuation1) + Number(valuation2) + Number(valuation3) + Number(valuation4) + Number(valuation5)) / 5;

            await expect(rwaValuation.connect(admin).calculateRatings(nftId, rwaTokenAddress))
                .to.emit(rwaValuation, "RwaEvaluated")
                .withArgs(rwaTokenAddress, nftId, averageValuation);
        });
    });


    describe("getValuation", function () {
        it("Should return the correct valuation details for an NFT", async function () {
            const { rwaValuation, rwaTokenAddress, validator1, validator2, validator3, validator4, validator5, admin } = await loadFixture(deployRWAValuationFixture);
            const nftId = 1;
            const secretCred = generateKeyPair();

            await rwaValuation.connect(admin).setUpRwaToValuate(nftId, secretCred.publicKey, rwaTokenAddress);
            await rwaValuation.connect(validator1).evaluateRwa(nftId, '100', rwaTokenAddress);
            await rwaValuation.connect(validator2).evaluateRwa(nftId, '200', rwaTokenAddress);
            await rwaValuation.connect(validator3).evaluateRwa(nftId, '300', rwaTokenAddress);
            await rwaValuation.connect(validator4).evaluateRwa(nftId, '400', rwaTokenAddress);
            await rwaValuation.connect(validator5).evaluateRwa(nftId, '500', rwaTokenAddress);

            const validators = [validator1.address, validator2.address, validator3.address, validator4.address, validator5.address];
            const decodedValuations = [100, 200, 300, 400, 500];

            await rwaValuation.connect(admin).setDecodedValuation(nftId, validators, decodedValuations, "0x5678", rwaTokenAddress);
            await rwaValuation.connect(admin).calculateRatings(nftId, rwaTokenAddress);

            const [retrievedPublicKeyHex, retrievedPrivateKey, finalValuation, finishedValuation, evaluators] = await rwaValuation.getValuation(nftId, rwaTokenAddress);

            // // Convert retrieved hexadecimal public key to byte array
            // const retrievedPublicKeyBytes = hexToBytes(retrievedPublicKeyHex);

            // // Convert retrieved byte array public key back to base64 string
            // const retrievedPublicKeyBase64 = bytesToBase64(retrievedPublicKeyBytes);

            // // Convert retrieved base64 public key back to PEM format
            // const retrievedPublicKey = fromBase64ToPublicKey(retrievedPublicKeyBase64);
            expect(retrievedPublicKeyHex).to.equal(secretCred.publicKey)
            expect(retrievedPrivateKey).to.equal("0x5678");
            expect(finalValuation).to.equal(300); // Average of 100, 200, 300, 400, 500
            expect(finishedValuation).to.be.true;
            expect(evaluators).to.deep.equal(validators);
        });
    });
});