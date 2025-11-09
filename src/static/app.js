document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Função utilitária para escapar HTML (prevenir XSS)
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and previous content
      activitiesList.innerHTML = "";

      // Clear previous select options except the placeholder
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - (details.participants ? details.participants.length : 0);

        // Build participants section
        let participantsHtml = '';
        const participants = details.participants || [];
        if (participants.length > 0) {
          participantsHtml = `<div class="activity-participants">
              <h5>Participants <span class="count">${participants.length}</span></h5>
              <ul>${participants.map(p => `<li>${escapeHtml(p)} <button class="delete-btn" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" title="Unregister">✖</button></li>`).join('')}</ul>
            </div>`;
        } else {
          participantsHtml = `<div class="activity-participants">
              <h5>Participants <span class="count">0</span></h5>
              <div class="empty">No participants yet — be the first!</div>
            </div>`;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${escapeHtml(String(spotsLeft))} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = 'message success';
        signupForm.reset();
        // Refresh activities so the new participant appears immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = 'message error';
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = 'message error';
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Delegate click handling for delete buttons (unregister participant)
  activitiesList.addEventListener('click', async (evt) => {
    const btn = evt.target.closest('.delete-btn');
    if (!btn) return;

    const activity = btn.dataset.activity;
    const email = btn.dataset.email;

    if (!activity || !email) return;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const response = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = 'message success';
        // Refresh activities list
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || 'Failed to unregister participant';
        messageDiv.className = 'message error';
      }
      messageDiv.classList.remove('hidden');
      setTimeout(() => messageDiv.classList.add('hidden'), 4000);
    } catch (err) {
      console.error('Error unregistering participant:', err);
      messageDiv.textContent = 'Failed to unregister participant. Please try again.';
      messageDiv.className = 'message error';
      messageDiv.classList.remove('hidden');
      setTimeout(() => messageDiv.classList.add('hidden'), 4000);
    }
  });
  // Initialize app
  fetchActivities();
});
