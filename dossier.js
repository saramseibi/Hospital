window.onload = function() {
        fetch('/documents')
            .then(response => response.json())
            .then(data => {
                const documentsList = document.getElementById('documents-list');
                data.documents.forEach(doc => {
                    const ipfsLink = `http://localhost:8080/ipfs/${doc.ipfsHash}`;
                    const documentThumbnail = `
                    <div class="document-thumbnail" onclick="window.open('${ipfsLink}', '_blank')">
    <div class="document-info d-flex align-items-center"> <!-- Utilisez une classe flex pour aligner horizontalement -->
        <div class="document-icon me-2"> <!-- Ajoutez une classe de marge à droite pour l'espacement -->
            <i class="fas fa-file-alt"></i>
        </div>
        <div class="document-name"> <!-- Ajoutez une classe pour le nom du document -->
            <p>${doc.fileName}</p>
        </div>
    </div>
</div>`;
                    documentsList.insertAdjacentHTML('afterbegin', documentThumbnail);
                });
            })
            .catch(error => console.error('Error fetching documents:', error));
    };

    $(document).ready(function() {
    $('#searchInput').on('input', function() {
        var searchText = $(this).val().toLowerCase();
        $('.document-thumbnail').each(function() {
            var fileName = $(this).find('.document-name p').text().toLowerCase();
            if (fileName.includes(searchText)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });
});
