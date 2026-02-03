# API PLAN

### RESOURCE: *users*
- GET /users
  - *Retrieve a list of all users.*
- POST /users
  - *Create a new user account.*
- GET /users/:id
  - *Retrieve a single user by ID.*
- PUT /users/:id
  - *Update an existing user.*
- DELETE /users/:id
  - *Delete a user account.*

---
### RESOURCE: *products*
- GET /products
  - *Retrieve all available products.*
- POST /products
  - *Create a new product.*
- GET /products/:id
  - *Retrieve a product by ID.*
- PUT /products/:id
  - *Update an existing product.*
- DELETE /products/:id
  - *Delete a product.*

---
### RESOURCE: *carts*
- POST /carts
  - *Create a new cart for a user.*
- GET /carts/:id
  - *Retrieve a cart by ID.*
- PUT /carts/:id
  - *Update cart metadata (e.g. status).*
- DELETE /carts/:id
  - *Delete a cart.*

---
### RESOURCE: *cart_items*
- GET /carts/:cartId/items
  - *Retrieve all items in a cart.*
- POST /carts/:cartId/items
  - *Add a product to a cart.*
- PUT /carts/:cartId/items/:productId
  - *Update the quantity of a product in the cart.*
- DELETE /carts/:cartId/items/:productId
  - *Remove a product from the cart.*
