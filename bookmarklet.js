(() => {
    if (window.chatArchiveActive) {
        document.getElementById("chat-archive-panel")?.remove();
        window.chatArchiveActive = false;
        return;
    }

    window.chatArchiveActive = true;

    const selectors = ["#ingamechatcontent", "#newbonklobby_chat_content"];
    const archive = [];
    const snapshots = new WeakMap();
    const hooked = new WeakSet();

    const save = (type, original, updated = "") => {
        original = String(original || "").trim();
        updated = String(updated || "").trim();
        if (!original || original === updated) return;

        archive.push({
            type,
            original,
            updated,
            time: new Date().toLocaleTimeString()
        });

        render();
    };

    const render = () => {
        const output = document.getElementById("chat-archive-output");
        if (!output) return;

        const filter = document.getElementById("chat-archive-filter")?.value || "all";
        const entries = archive.filter(item => filter === "all" || item.type === filter);

        output.innerHTML = "";

        entries.slice().reverse().forEach(item => {
            const entry = document.createElement("div");
            entry.style.cssText = "padding:10px;border-bottom:1px solid #333;word-break:break-word";

            const heading = document.createElement("div");
            heading.style.cssText = "color:#999;font-size:11px;margin-bottom:5px";
            heading.textContent = `${item.type.toUpperCase()} · ${item.time}`;

            const original = document.createElement("div");
            original.style.cssText = "color:#eee";
            original.textContent = item.original;

            entry.append(heading, original);

            if (item.updated) {
                const updated = document.createElement("div");
                updated.style.cssText = "color:#aaa;margin-top:5px";
                updated.textContent = "Edited to: " + item.updated;
                entry.appendChild(updated);
            }

            output.appendChild(entry);
        });
    };

    const scan = container => {
        [...container.children].forEach(row => {
            if (!snapshots.has(row)) {
                snapshots.set(row, row.textContent.trim());
            }
        });
    };

    const observe = container => {
        if (hooked.has(container)) return;
        hooked.add(container);
        scan(container);

        new MutationObserver(records => {
            for (const mutation of records) {
                if (mutation.type === "childList") {
                    mutation.removedNodes.forEach(node => {
                        if (node.nodeType !== 1 || node.parentElement === container) return;
                        const previous = snapshots.get(node);
                        if (previous && !node.isConnected) {
                            save("deleted", previous);
                        }
                    });
                }

                let row = mutation.target.nodeType === 1
                    ? mutation.target
                    : mutation.target.parentElement;

                while (row && row.parentElement !== container) {
                    row = row.parentElement;
                }

                if (!row) continue;

                const previous = snapshots.get(row);
                const current = row.textContent.trim();

                if (previous && current && previous !== current) {
                    save("edited", previous, current);
                }

                snapshots.set(row, current);
            }

            scan(container);
        }).observe(container, {
            childList: true,
            characterData: true,
            subtree: true
        });
    };

    const panel = document.createElement("div");
    panel.id = "chat-archive-panel";
    panel.style.cssText = "position:fixed;top:10%;right:20px;width:360px;height:70vh;background:#111;color:white;border:1px solid #444;border-radius:10px;z-index:2147483647;font:13px Arial;display:flex;flex-direction:column;box-shadow:0 5px 30px #000";

    panel.innerHTML = `
        <div style="padding:12px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center">
            <b>CHAT ARCHIVE</b>
            <button id="chat-archive-close" style="background:#333;color:white;border:0;padding:6px 10px;cursor:pointer">×</button>
        </div>
        <div style="padding:10px;display:flex;gap:6px">
            <select id="chat-archive-filter" style="flex:1;background:#222;color:white;border:1px solid #444;padding:7px">
                <option value="all">All messages</option>
                <option value="deleted">Deleted</option>
                <option value="edited">Edited</option>
            </select>
            <button id="chat-archive-export" style="background:#333;color:white;border:0;padding:7px;cursor:pointer">Export</button>
            <button id="chat-archive-clear" style="background:#333;color:white;border:0;padding:7px;cursor:pointer">Clear</button>
        </div>
        <div id="chat-archive-output" style="overflow-y:auto;flex:1;padding:5px"></div>
        <div style="padding:8px;color:#888;border-top:1px solid #333" id="chat-archive-count">0 archived messages</div>
    `;

    document.body.appendChild(panel);

    const originalRender = render;
    render = () => {
        originalRender();
        const count = document.getElementById("chat-archive-count");
        if (count) count.textContent = archive.length + " archived messages";
    };

    document.getElementById("chat-archive-close").onclick = () => {
        panel.remove();
        window.chatArchiveActive = false;
    };

    document.getElementById("chat-archive-filter").onchange = render;

    document.getElementById("chat-archive-clear").onclick = () => {
        archive.length = 0;
        render();
    };

    document.getElementById("chat-archive-export").onclick = () => {
        const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "chat-archive.json";
        link.click();
        URL.revokeObjectURL(url);
    };

    const init = () => {
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(observe);
        });
    };

    init();

    new MutationObserver(init).observe(document.body, {
        childList: true,
        subtree: true
    });
})();
