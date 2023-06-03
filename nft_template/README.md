## Adding a new NFT
Example of adding a new NFT to the NFT template.

The first argument assumes the directory contains 1.png, 2.png, and 3.png where n (1-3) is the scale.
The second argument is the NFT ID.
The third argument is the NFT type.

Command arguments.
```bash
./add_nft.sh <folder location> <short nft id> armor
```


## Example Steps:
1) Extract the zip somewhere. 

2) Setup the branch.
```
git checkout main
git pull
git checkout -b new_nft_name
```
Run the add_nft command
```bash
cd nft_template # if you are not already here
./add_nft.sh "/mnt/c/Users/username/OneDrive/Documents/LOOPERLANDS/Punk_Cyborg_268" 0xee40d44f7847999cb4d7d1e3fc7681e1390fc5acc5e835d1e8f0ed717d4dc200 armor
```
You should see a command with no errors.

Note that the second argument is a WSL path. If you are using WSL, replace the parts after /mnt/ with 
the directory you created in step 1 but change the `\` to `/`.

3) Commit the changes
```bash
git commit -am "add new nft. put something descriptive here"
git push --set-upstream origin new_nft_name
```
4) Open a pull request on your branch on Github.com

5) Next, ask an admin to merge your pull request and run the backend process.
```bash
sudo su
cd /home/root
./add_looplands_nft.sh 0x675a39b27b2ddbdb2d18485562efbe2b2772987a-0-0x3add4c3824813b2d4e9fdd3ed678857aa6bcdd4d-0xeac17febcaf13e4f2a07aab923d7e527a8414712b9f6732465970e16853f0daa-10 "Art Magic"
```

