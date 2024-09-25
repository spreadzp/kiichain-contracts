// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";

contract RwaValuation {

    // Struct to store RWA information
    struct Valuation {
        address rwaToken; // Address of the RWA token
        uint256 nftId; // ID of the NFT
        string publicKeyToValuate; // Public key used for valuation
        string privateKeyToValuate; // Private key used for valuation
        uint256 finalValuation; // Final valuation of the RWA
        bool finishedValuation; // Whether the valuation process is finished
        address[] evaluators; // List of validators who have evaluated the RWA
        mapping(address => string) encodedValuations; // Encoded valuations by validators
        mapping(address => uint256) decodedValuations; // Decoded valuations by validators
    }

    // Mapping of RWA token address and NFT ID to Valuation struct
    mapping(address => mapping(uint256 => Valuation)) public rwaInfo;

    // Mapping to store validator ratings
    mapping(address => uint256) public validatorRatings;

    // Mapping to track validators
    mapping(address => bool) public isValidator;

    // List of validator addresses
    address[] public validators; 

    // Event emitted when a validator submits an evaluation
    event Evaluated(address indexed rwaToken, uint256 indexed nftId, address indexed validator, string valuation);
    event SetupRwaToEvaluate(address indexed rwaToken, uint256 indexed nftId);
    event RwaEvaluated(address indexed rwaToken, uint256 indexed nftId, uint256 valuation);
    event FinishEvaluated(address indexed rwaToken, uint256 indexed nftId);

    // Admin address
    address public admin;

    // Constructor, initializing the list of validators and setting the admin
    constructor(address[] memory _validators, address _admin) {
        admin = _admin;
        for (uint i = 0; i < _validators.length; i++) {
            validators.push(_validators[i]);
            isValidator[_validators[i]] = true;
        }
    }

    // Modifier to check if the sender is a validator
    modifier onlyValidator() {
        require(isValidator[msg.sender], "You are not a validator.");
        _;
    }

    // Modifier to check if the sender is the admin
    modifier onlyAdmin() {
        require(msg.sender == admin, "You are not the admin.");
        _;
    }
    
    function setUpRwaToValuate(uint256 nftId, string memory publicKeyToValuate, address rwaToken) external onlyAdmin {
        rwaInfo[rwaToken][nftId].rwaToken = rwaToken;
        rwaInfo[rwaToken][nftId].nftId = nftId;
        rwaInfo[rwaToken][nftId].publicKeyToValuate = publicKeyToValuate;
        rwaInfo[rwaToken][nftId].finalValuation = 0;
        rwaInfo[rwaToken][nftId].finishedValuation = false;
        rwaInfo[rwaToken][nftId].evaluators = new address[](0);

        emit SetupRwaToEvaluate(rwaToken, nftId);
    }

    // Function to evaluate an RWA, callable by validators only
    function evaluateRwa(uint256 nftId, string memory encodedValuation, address rwaToken) external onlyValidator {
        require(!rwaInfo[rwaToken][nftId].finishedValuation , "You can only evaluate an RWA once per NFT.");
        require(!hasEvaluated(nftId, msg.sender, rwaToken), "You have already evaluated this NFT.");

        // Record the encoded evaluation in the mapping
        rwaInfo[rwaToken][nftId].encodedValuations[msg.sender] = encodedValuation;
        rwaInfo[rwaToken][nftId].evaluators.push(msg.sender);

        emit Evaluated(rwaToken, nftId, msg.sender, encodedValuation); 
        if (rwaInfo[rwaToken][nftId].evaluators.length == validators.length) {
            emit FinishEvaluated(rwaToken, nftId);
        }
    }

    // Function to set the decoded valuations using the private key
    function setDecodedValuation(uint256 nftId, address[] memory rwaValidators, uint256[] memory decodedValuations, string memory privateKey, address rwaToken) external onlyAdmin {
        require(rwaValidators.length == decodedValuations.length, "Invalid input lengths");
        // require(rwaInfo[rwaToken][nftId].publicKeyToValuate.length > 0, "RWA not set up for valuation");

        for (uint256 i = 0; i < rwaValidators.length; i++) {
            rwaInfo[rwaToken][nftId].decodedValuations[rwaValidators[i]] = decodedValuations[i];
        }

        rwaInfo[rwaToken][nftId].privateKeyToValuate = privateKey;
    }

    // Function to calculate the ratings of validators based on their evaluations
    function calculateRatings(uint256 nftId, address rwaToken) external onlyAdmin {
        uint256 numValidators = validators.length;
        uint256[] memory valuations = new uint256[](numValidators);

        // Gather decoded evaluations into an array
        for (uint256 i = 0; i < numValidators; i++) {
            address evaluator = rwaInfo[rwaToken][nftId].evaluators[i];
            valuations[i] = rwaInfo[rwaToken][nftId].decodedValuations[evaluator];
        }

        // Sort the array of evaluations
        sort(valuations);

        // Compute the average of the lower half of evaluations
        uint256 sum = 0;
        uint256 halfSize = numValidators / 2; // Lower half size
        for (uint256 i = 0; i <= halfSize; i++) {
            sum += valuations[i];
        }
        uint256 lowerHalfAverage = sum / halfSize;

        // Calculate the upper bound (3 times the lower half average)
        uint256 upperBound = 3 * lowerHalfAverage;
        uint256[] memory normalizedValuations = new uint256[](numValidators);

        // Normalize valuations if they exceed the upper bound
        for (uint256 i = 0; i < valuations.length; i++) {
            if (valuations[i] >= upperBound && valuations[i] == 0) {
                normalizedValuations[i] = lowerHalfAverage;
            } else {
                normalizedValuations[i] = valuations[i];
            }
        }

        // Calculate the average valuation from normalized values
        uint256 sumNormalized = 0;
        for (uint256 i = 0; i < normalizedValuations.length; i++) {
            sumNormalized += normalizedValuations[i];
        }
        uint256 averageValuate = sumNormalized / normalizedValuations.length;

        console.log("upperBound, lowerHalfAverage, averageValuate from %s to %s %s tokens",
            upperBound,
            lowerHalfAverage,
            averageValuate
        );

        rwaInfo[rwaToken][nftId].finalValuation = averageValuate;
        rwaInfo[rwaToken][nftId].finishedValuation = true;

        // Update validator ratings based on proximity to the average valuation
        for (uint256 i = 0; i < numValidators; i++) {
            address evaluator = rwaInfo[rwaToken][nftId].evaluators[i];
            uint256 evaluation = rwaInfo[rwaToken][nftId].decodedValuations[evaluator];

            // Adjusted conditions:
            if (evaluation <= (averageValuate * 125) / 100 && evaluation >= (averageValuate * 75) / 100) {
                // Evaluation is within ±25% of the average
                validatorRatings[evaluator] += 10;
            } else if (evaluation <= (averageValuate * 170) / 100 && evaluation >= (averageValuate * 30) / 100) {
                // Evaluation is within ±70% of the average
                validatorRatings[evaluator] += 5;
            } else {
                // Any evaluation outside the ±70% range
                validatorRatings[evaluator] += 1;
            }
        }

        emit RwaEvaluated(rwaToken, nftId, averageValuate);
    }

    // Helper function to sort an array of evaluations
    function sort(uint256[] memory arr) internal pure {
        uint256 n = arr.length;
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    uint256 temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }

    // Function to get the list of validators
    function getValidators() external view returns (address[] memory) {
        return validators;
    }

    // Function to get the average valuation for a specific NFT
    function getAverageValuation(uint256 nftId, address rwaToken) external view returns (uint256) {
        uint256 evaluatorCount = rwaInfo[rwaToken][nftId].evaluators.length;
        require(evaluatorCount > 0, "No evaluations for this NFT");

        uint256 sum = 0;
        for (uint256 i = 0; i < evaluatorCount; i++) {
            address evaluator = rwaInfo[rwaToken][nftId].evaluators[i];
            sum += rwaInfo[rwaToken][nftId].decodedValuations[evaluator];
        }

        // Explicitly drop decimals by using integer division
        return sum / evaluatorCount;
    }

    // Function to set up a new admin, callable by the current admin only
    function setupNewAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin address cannot be zero");
        admin = newAdmin;
    }

    // Function to add a new validator, callable by the admin only
    function addValidator(address newValidator) external onlyAdmin {
        require(!isValidator[newValidator], "Validator already exists");
        validators.push(newValidator);
        isValidator[newValidator] = true;
    }

    // Function to remove a validator, callable by the admin only
    function removeValidator(address validatorToRemove) external onlyAdmin {
        require(isValidator[validatorToRemove], "Validator does not exist");
        for (uint256 i = 0; i < validators.length; i++) {
            if (validators[i] == validatorToRemove) {
                validators[i] = validators[validators.length - 1];
                validators.pop();
                isValidator[validatorToRemove] = false;
                break;
            }
        }
    }

    // Function to check if a validator has evaluated a specific NFT
    function hasEvaluated(uint256 nftId, address validator, address rwaToken) public view returns (bool) {
        for (uint256 i = 0; i < rwaInfo[rwaToken][nftId].evaluators.length; i++) {
            if (rwaInfo[rwaToken][nftId].evaluators[i] == validator) {
                return true;
            }
        }
        return false;
    }

    // Function to get the Valuation struct for a specific NFT
    function getValuation(uint256 nftId, address rwaToken) public view returns (string memory, string memory, uint256, bool, address[] memory, address) {
        Valuation storage valuation = rwaInfo[rwaToken][nftId];
        return (valuation.publicKeyToValuate, valuation.privateKeyToValuate, valuation.finalValuation, valuation.finishedValuation, valuation.evaluators, valuation.rwaToken);
    }

    // Function to get the encoded valuation for a specific NFT and validator
    function getEncodedValuation(uint256 nftId, address validator, address rwaToken) public view returns (string memory) {
        return rwaInfo[rwaToken][nftId].encodedValuations[validator];
    }

    // Function to get the decoded valuation for a specific NFT and validator
    function getDecodedValuation(uint256 nftId, address validator, address rwaToken) public view returns (uint256) {
        return rwaInfo[rwaToken][nftId].decodedValuations[validator];
    }

    function getValidatorRating(address validator ) external view returns (uint256) {
        return validatorRatings[validator];
    }
}