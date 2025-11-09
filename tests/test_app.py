import copy
import urllib.parse

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


client = TestClient(app)


@pytest.fixture(autouse=True)
def restore_activities():
    # make a deep copy of the in-memory activities and restore after each test
    orig = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(orig)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_and_reflects_in_activity():
    activity = "Chess Club"
    email = "tempuser@example.com"

    # Ensure not already present
    assert email not in activities[activity]["participants"]

    resp = client.post(f"/activities/{urllib.parse.quote(activity)}/signup", params={"email": email})
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Check the participant appears in the activity
    resp2 = client.get("/activities")
    assert resp2.status_code == 200
    assert email in resp2.json()[activity]["participants"]


def test_signup_already_signed():
    activity = "Chess Club"
    existing = activities[activity]["participants"][0]

    resp = client.post(f"/activities/{urllib.parse.quote(activity)}/signup", params={"email": existing})
    assert resp.status_code == 400


def test_delete_participant():
    activity = "Chess Club"
    email = "todelete@example.com"

    # Sign up the temporary participant
    resp = client.post(f"/activities/{urllib.parse.quote(activity)}/signup", params={"email": email})
    assert resp.status_code == 200

    # Delete the participant
    resp2 = client.delete(f"/activities/{urllib.parse.quote(activity)}/participants", params={"email": email})
    assert resp2.status_code == 200

    # Verify participant no longer present
    resp3 = client.get("/activities")
    assert resp3.status_code == 200
    assert email not in resp3.json()[activity]["participants"]
