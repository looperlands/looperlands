(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.AttackWarning = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function warningTile(ctx,x,y,progress,impact) {
        ctx.fillStyle = impact ? 'rgba(232,134,72,.24)' : `rgba(227,174,100,${.06+.08*progress})`;
        ctx.fillRect(x+1,y+1,14,14);
        ctx.strokeStyle = `rgba(239,192,123,${impact ? .8 : .4+.3*progress})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Small corner marks leave the center clear, without a full box or an X.
        for (const [cx,cy,dx,dy] of [[1.5,1.5,1,1],[14.5,1.5,-1,1],[1.5,14.5,1,-1],[14.5,14.5,-1,-1]]) {
            ctx.moveTo(x+cx,y+cy+dy*3);ctx.lineTo(x+cx,y+cy);ctx.lineTo(x+cx+dx*3,y+cy);
        }
        ctx.stroke();
    }
    return {tile: warningTile};
});
