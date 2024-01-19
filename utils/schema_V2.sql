-- users
CREATE TABLE users(
    id INTEGER NOT NULL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    address CHAR(42) NOT NULL UNIQUE,
    balance NUMERIC(8,2) NOT NULL DEFAULT 0,
    nonce CHAR(42) NOT NULL
);

CREATE INDEX users_username ON users(username);
CREATE INDEX users_address ON users(address);

CREATE SEQUENCE users_id_seq OWNED BY users.id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');


-- sessions
CREATE TABLE sessions(
	sessionId UUID NOT NULL PRIMARY KEY,
	userId INTEGER NOT NULL REFERENCES users(id)
);

-- walletbridger
CREATE TABLE wallets(
    userId INTEGER NOT NULL PRIMARY KEY REFERENCES users(id),
    address CHAR(42) NOT NULL UNIQUE,
    pkey CHAR(66) NOT NULL
);
