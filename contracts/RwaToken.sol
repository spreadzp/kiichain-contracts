// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RwaToken is ERC721, ERC721URIStorage, Ownable {

    // Counter for auto-incrementing token IDs
    uint256 private _tokenIdCounter;

    // Event emitted when the URL for an NFT is updated
    event UrlUpdated(uint256 indexed tokenId, string url);

    constructor(string memory name, string memory symbol) ERC721(name, symbol) Ownable(msg.sender) {
        _tokenIdCounter = 1; // Start token IDs from 1 (optional)
    }

    /**
     * @dev Function to set the URL for a specific token. Can only be called by the owner.
     * @param tokenId The ID of the NFT token
     * @param url The metadata URL for the token
     */
    function setUrl(uint256 tokenId, string memory url) external onlyOwner {
        require(_exists(tokenId), "RwaToken: URL set of nonexistent token");
        _setTokenURI(tokenId, url);
        emit UrlUpdated(tokenId, url);
    }

    function mint(address to, string memory uri) public onlyOwner {
         uint256 newTokenId = _tokenIdCounter;  // Use the current counter value as tokenId
        _tokenIdCounter++;  
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, uri);
        emit UrlUpdated(newTokenId, uri);
    }

    // /**
    //  * @dev Function to retrieve the URL for a specific token
    //  * @param tokenId The ID of the NFT token
    //  * @return The metadata URL for the token
    //  */
    // function getUrl(uint256 tokenId) external view returns (string memory) {
    //     require(_exists(tokenId), "RwaToken: URL query for nonexistent token");
    //     return tokenURI(tokenId);
    // }
 

    // The following functions are overrides required by Solidity.
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        require(_exists(tokenId), "RwaToken: URL query for nonexistent token");
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns the current tokenId counter value.
     * This can be useful if you need to know the next tokenId in advance.
     */
    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Checks if a token exists
     * @param tokenId uint256 ID of the token to query the existence of
     * @return bool whether the token exists
     */
    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}