document.addEventListener("DOMContentLoaded", function () {
  // THEME TOGGLE
  var themeBtn = document.getElementById("themeToggle");
  var savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    if (themeBtn) themeBtn.textContent = "☀️";
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      document.body.classList.toggle("dark");
      if (document.body.classList.contains("dark")) {
        localStorage.setItem("theme", "dark");
        themeBtn.textContent = "☀️";
      } else {
        localStorage.setItem("theme", "light");
        themeBtn.textContent = "🌙";
      }
    });
  }

  // ACTIVE NAV
  var currentPage = window.location.pathname.split("/").pop();
  if (currentPage === "") currentPage = "index.html";
  document.querySelectorAll("header nav a").forEach(function (link) {
    link.classList.remove("active");
    if (link.getAttribute("href") === currentPage) link.classList.add("active");
  });

  // Shared member cache, loaded from the real API
  var cachedMembers = [];

  function fetchMembers() {
    return fetch(CONFIG.API_URL + "/members")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        cachedMembers = data;
        return data;
      })
      .catch(function (err) {
        console.error("Failed to load members", err);
        return [];
      });
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  // RECORD PAYMENT PAGE
  var nameInput = document.getElementById("memberName");
  var amountInput = document.getElementById("amountPaid");
  var dateInput = document.getElementById("paymentDate");
  var saveBtn = document.getElementById("saveBtn");
  var msgBox = document.getElementById("messageBox");
  var memberSuggBox = document.getElementById("memberSuggestions");
  var selectedMemberId = null;

  function showMessage(text, type) {
    if (!msgBox) return;
    msgBox.textContent = text;
    msgBox.className = "messageBox " + type;
    msgBox.style.display = "block";
    setTimeout(function () { msgBox.style.display = "none"; }, 2500);
  }

  function showMemberSuggest(val) {
    if (!memberSuggBox) return;
    if (!val) { memberSuggBox.style.display = "none"; return; }
    var matches = cachedMembers.filter(function (m) {
      return m.name.toLowerCase().includes(val.toLowerCase());
    });
    if (matches.length === 0) { memberSuggBox.style.display = "none"; return; }
    memberSuggBox.innerHTML = "";
    matches.forEach(function (m) {
      var div = document.createElement("div");
      div.innerHTML = "<strong>" + m.name + "</strong>";
      div.addEventListener("click", function (e) {
        e.stopPropagation();
        nameInput.value = m.name;
        selectedMemberId = m.memberId;
        memberSuggBox.style.display = "none";
        amountInput.focus();
      });
      memberSuggBox.appendChild(div);
    });
    memberSuggBox.style.display = "block";
  }

  if (nameInput) {
    fetchMembers();
    nameInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^A-Za-z ]/g, "");
      selectedMemberId = null;
      showMemberSuggest(this.value);
    });
    nameInput.addEventListener("focus", function () {
      showMemberSuggest(this.value);
    });
  }

  if (dateInput) {
    dateInput.value = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var name = nameInput.value.trim();
      var amount = parseFloat(amountInput.value);
      if (!name || isNaN(amount) || amount <= 0) {
        showMessage("Enter name and a positive amount", "error");
        return;
      }

      var payload = { name: name, amount: amount };
      if (selectedMemberId) payload.memberId = selectedMemberId;

      saveBtn.disabled = true;
      fetch(CONFIG.API_URL + "/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Request failed with status " + res.status);
          return res.json();
        })
        .then(function () {
          showMessage("Payment for " + name + " saved!", "success");
          nameInput.value = "";
          amountInput.value = "";
          selectedMemberId = null;
          if (memberSuggBox) memberSuggBox.style.display = "none";
          fetchMembers();
        })
        .catch(function (err) {
          console.error(err);
          showMessage("Something went wrong. Please try again.", "error");
        })
        .finally(function () {
          saveBtn.disabled = false;
        });
    });
  }

  // MEMBERS PAGE
  var listDiv = document.getElementById("memberListContainer");
  var search = document.getElementById("searchInput");
  var suggBox = document.getElementById("suggestions");

  function render(filter) {
    if (!listDiv) return;
    filter = filter || "";
    listDiv.innerHTML = "";
    var filtered = cachedMembers.filter(function (m) {
      return m.name.toLowerCase().includes(filter.toLowerCase());
    });
    var sub = document.querySelector("main p");
    if (sub) sub.textContent = filtered.length + " registered members. Click a name to view their payment history.";
    if (filtered.length === 0) {
      listDiv.innerHTML = '<p style="text-align:center; padding:30px; color:#888;">No members found.</p>';
      return;
    }
    filtered.forEach(function (m) {
      var row = document.createElement("div");
      row.className = "memberRow";
      row.style.cursor = "pointer";
      var total = m.total || 0;
      var count = m.paymentCount || 0;
      row.innerHTML =
        '<div class="left"><strong>' + m.name + '</strong><span>Last paid: ' + formatDate(m.lastPaidAt) + '</span></div>' +
        '<div class="right">' +
          '<span class="badge">GHS' + Number(total).toFixed(2) + '</span>' +
          '<small>' + count + (count === 1 ? ' pmt' : ' pmts') + '</small>' +
          '<div class="menuWrap">' +
            '<button class="dotsBtn">⋮</button>' +
            '<div class="dotsMenu"><button class="deleteBtn">Delete</button></div>' +
          '</div>' +
        '</div>';
      row.addEventListener("click", function (e) {
        if (e.target.closest(".menuWrap")) return;
        window.location.href = "member-details.html?id=" + encodeURIComponent(m.memberId) + "&name=" + encodeURIComponent(m.name);
      });
      var dotsBtn = row.querySelector(".dotsBtn");
      var dotsMenu = row.querySelector(".dotsMenu");
      dotsBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        document.querySelectorAll(".dotsMenu").forEach(function (o) { if (o !== dotsMenu) o.classList.remove("show"); });
        dotsMenu.classList.toggle("show");
      });
      row.querySelector(".deleteBtn").addEventListener("click", function (e) {
        e.stopPropagation();
        if (!confirm("Delete " + m.name + "? Their payment history will be kept for records.")) return;
        fetch(CONFIG.API_URL + "/members/" + encodeURIComponent(m.memberId), { method: "DELETE" })
          .then(function (res) {
            if (!res.ok) throw new Error("Delete failed with status " + res.status);
            return res.json();
          })
          .then(function () {
            cachedMembers = cachedMembers.filter(function (x) { return x.memberId !== m.memberId; });
            render(search ? search.value : "");
          })
          .catch(function (err) {
            console.error(err);
            alert("Could not delete member. Please try again.");
          });
      });
      listDiv.appendChild(row);
    });
  }

  function showSuggestions(val) {
    if (!suggBox || !val) { if (suggBox) suggBox.style.display = "none"; return; }
    var matches = cachedMembers.filter(function (m) {
      return m.name.toLowerCase().includes(val.toLowerCase());
    }).slice(0, 5);
    if (matches.length === 0) { suggBox.style.display = "none"; return; }
    suggBox.innerHTML = "";
    matches.forEach(function (m) {
      var div = document.createElement("div");
      div.textContent = m.name;
      div.addEventListener("click", function (e) {
        e.stopPropagation();
        search.value = m.name;
        suggBox.style.display = "none";
        render(m.name);
      });
      suggBox.appendChild(div);
    });
    suggBox.style.display = "block";
  }

  if (listDiv) {
    fetchMembers().then(function () { render(); });
  }

  if (search) {
    search.addEventListener("input", function (e) {
      render(e.target.value);
      showSuggestions(e.target.value);
    });
  }

  document.addEventListener("click", function (e) {
    if (suggBox && !e.target.closest("#suggestions") && e.target !== search) {
      suggBox.style.display = "none";
    }
    if (memberSuggBox && !e.target.closest("#memberSuggestions") && e.target !== nameInput) {
      memberSuggBox.style.display = "none";
    }
  });

  // MEMBER DETAILS PAGE
  var detailName = document.getElementById("detailName");
  if (detailName) {
    var params = new URLSearchParams(window.location.search);
    var memberId = params.get("id");
    var nameParam = params.get("name");
    if (nameParam) detailName.textContent = decodeURIComponent(nameParam);

    if (memberId) {
      fetch(CONFIG.API_URL + "/members/" + encodeURIComponent(memberId) + "/payments")
        .then(function (res) { return res.json(); })
        .then(function (payments) {
          var body = document.getElementById("historyBody");
          body.innerHTML = "";
          var total = 0;
          payments.forEach(function (p) {
            total += p.amount;
            var dateStr = new Date(p.paidAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
            body.innerHTML += '<div class="row"><span>' + dateStr + '</span><span>GHS' + p.amount.toFixed(2) + '</span></div>';
          });
          document.getElementById("detailTotal").textContent = "GHS" + total.toFixed(2);
          document.getElementById("detailCount").textContent = payments.length;
          document.getElementById("detailAvg").textContent = "GHS" + (payments.length ? (total / payments.length).toFixed(2) : "0.00");
          document.getElementById("historyTotal").textContent = "GHS" + total.toFixed(2);
          if (payments.length) {
            var firstDate = new Date(payments[payments.length - 1].paidAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
            document.getElementById("detailSince").textContent = "Member since " + firstDate;
          }
        })
        .catch(function (err) {
          console.error("Failed to load payment history", err);
        });
    }
  }
});