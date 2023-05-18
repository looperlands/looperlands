## Adding a new NFT
Example of adding a new NFT to the NFT template.

The first argument assumes the directory contains 1.png, 2.png, and 3.png where n (1-3) is the scale.
The second argument is the NFT ID.
The third argument is the NFT type.
```bash
./add_nft.sh /home/yuno/Downloads/Spritesheet_2 0x3c1fa300af2deef916ade14eb6ca68dd14913e4adc4a4d174ea98f1f878ef733 armor
```


--
Smileyphase steps:
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


