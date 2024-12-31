const deleteProduct = (btn) => {
    const prodId = btn.parentNode.querySelector('[name=productId]').value;
    const csrf = btn.parentNode.querySelector('[name=_csrf]').value;

    const produtBox = btn.closest("article"); // getting the closest [article] element to the btn which is the parent representing the entire box of the product

    // Sending the request for deleting the prod from the client side using the method [fetch] which is a method supported by the browser to send HTTP requests
    fetch('/admin/product/' + prodId, { // the object which is the second parameter to add config. to the request
        method: 'DELETE',
        headers: { // we must add the csrfToken to the request, then the package [csurf] looks for this token, then this package looks into the body object, but here the method is 'DELETE' no body object, the package also can look into the query parameters(it is not available here), then it will look into the headers object and the key [csrf-token]
            'csrf-token': csrf
        }
    })
        .then(result => { // the [result] here represents the respone which in controller method in the backend 
            produtBox.parentNode.removeChild(produtBox);
            return result.json(); // getting the json data of the response
        })
        .then(data => {
            console.log(data); // it will give the object {message: "Success!"} due to [res.status(200).json({message: "Success!"});] in the controller method [deleteProduct]
        })
        .catch(err => {
            console.log(err);
        });
};