# UCP Python REST Demo - Flower Shop

## Architecture Explanation
This application is a reference implementation of a Universal Commerce Protocol (UCP) Merchant Server.
It is built using:
- **Python**
- **FastAPI** for the REST API.
- **SQLite** for data persistence (products and transactions).

The server exposes endpoints for discovery (`/.well-known/ucp`), checkout session management, and simulation of events like shipping.

## Application Explanation
The demo implements a storefront for a fictional **Flower Shop**.
It allows customers (simulated by the client script) to:
- Discover capabilities.
- Create a checkout session.
- Add items (e.g., bouquets of roses) to the cart.
- Select fulfillment options.
- Complete the purchase with a mock payment.

## How to Execute Locally

### Prerequisites
- `uv` installed (`curl -LsSf https://astral.sh/uv/install.sh | sh`)

### 1. Initialize the Database
Run the following command from the `samples/rest/python/server` directory to create and populate the database:
```bash
uv run import_csv.py \
    --products_db_path=/tmp/ucp_test/products.db \
    --transactions_db_path=/tmp/ucp_test/transactions.db \
    --data_dir=../test_data/flower_shop
```

### 2. Run the Server
Start the server from the `samples/rest/python/server` directory:
```bash
uv run server.py \
   --products_db_path=/tmp/ucp_test/products.db \
   --transactions_db_path=/tmp/ucp_test/transactions.db \
   --port=8182
```

### 3. Run the Client
In a new terminal, run the client from the `samples/rest/python/client/flower_shop` directory:
```bash
uv run simple_happy_path_client.py --server_url=http://localhost:8182
```

Alternatively, you can run the automated script that does all steps:
```bash
cd samples/rest/python/client/flower_shop
./extract_json_dialog.sh
```
