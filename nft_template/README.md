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
./add_nft.sh "/mnt/c/Users/username/OneDrive/Documents/loopquest/Punk_Cyborg_268" 0xee40d44f7847999cb4d7d1e3fc7681e1390fc5acc5e835d1e8f0ed717d4dc200 armor
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




## Smileyphase steps:
Steps - assumes loopquest has been pulled from github to /home/[user]/loopquest/

1. Copy Avatar .png files to \\wsl.localhost\Ubuntu\home\[user]\[project]
make sure they are named 1.png, 2.png, 3.png

* Add the Full NFTID to the end of loopworms.io /root/snapshot/linux-x64/nftIds.txt
* Run /root/snapshot/linux-x64/import.sh if it is 20 minutes before the 30 minute snapshot/cron job
* Add the Full NFTID and Short NFTID to the loopworms.io LoopQuest-Avatars table

2. In VSCode WSL Terminal:
cd /home/[user]/loopquest/
git checkout main
git pull

3. In VSCode WSL Terminal:
cd /home/[user]/loopquest/nft_template
./add_nft.sh "/home/[user]/[project]/" 0xb26214bac18f742d93b948c44ccd05c768f8344c7c89d6550a67e4f919ad7e6f armor

4. 
0x2530bd882f78be80636b02467386e272f87bdb27d6762b41bd09dd71407bdcb1
cd ..
git status
git commit -m "added a nft"
git push


