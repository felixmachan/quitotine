def test_register_and_login(client):
    register = client.post(
        "/api/v1/auth/register",
        json={"email": "a@example.com", "password": "StrongPass1!"},
    )
    assert register.status_code == 200
    data = register.json()
    assert "access_token" in data and "refresh_token" in data

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "a@example.com", "password": "StrongPass1!"},
    )
    assert login.status_code == 200
    data = login.json()
    assert "access_token" in data and "refresh_token" in data
