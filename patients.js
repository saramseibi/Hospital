
$(document).ready(function() {
// Fonction pour effectuer la recherche
$('#searchInput').on('input', function() {
 var searchText = $(this).val().toLowerCase(); // Récupérer le texte de recherche et le convertir en minuscules
 $('#patientList tr').filter(function() {
     $(this).toggle($(this).text().toLowerCase().indexOf(searchText) > -1); // Afficher ou masquer les lignes de tableau en fonction de la correspondance de texte
 });
});

// Ajouter également la fonction de recherche lors du clic sur le bouton de recherche
$('#searchBtn').click(function() {
 var searchText = $('#searchInput').val().toLowerCase(); // Récupérer le texte de recherche et le convertir en minuscules
 $('#patientList tr').filter(function() {
     $(this).toggle($(this).text().toLowerCase().indexOf(searchText) > -1); // Afficher ou masquer les lignes de tableau en fonction de la correspondance de texte
 });
});
});


// Fonction pour rafraîchir la liste des patients
function refreshPatientList() {
// Effacer la liste actuelle des patients
$('#patientList').empty();

// Effectuer une nouvelle requête AJAX pour récupérer les données des patients mis à jour
$.get('/patients')
 .done(function(data) {
     // Parcourir les données récupérées et ajouter chaque patient au tableau
     data.forEach(function(patient) {
         addPatientRow(patient);
     });
 })
 .fail(function(jqXHR, textStatus, errorThrown) {
     console.error('Erreur lors de la récupération des données des patients:', errorThrown);
 });
}

// Fonction pour ajouter une nouvelle ligne de patient au tableau
function addPatientRow(patient) {
// Créer une nouvelle ligne de tableau pour le patient
var row = $('<tr>');

// Remplir les cellules de la ligne avec les données du patient
row.html(`
 <td>${patient.patient_name}</td>
 <td>${patient.age}</td>
 <td>${patient.phone}</td>
 <td>${patient.diagnosis}</td>
 <td>${patient.treatment}</td>
 <td>


<i class="material-icons delete-btn" style="font-size:36px ; cursor: pointer;" data-name="${patient.patient_name}">delete</i>

 </td>
`);

// Ajouter la ligne au tbody
$('#patientList').append(row);
}



// Logique pour supprimer un patient
$(document).on('click', '.delete-btn', function() {
var patientName = $(this).data('name'); // Récupérer le nom du patient depuis l'attribut data-name du bouton

// Référence à la ligne de tableau correspondant au bouton supprimé
var row = $(this).closest('tr');

// Requête AJAX pour supprimer le patient de la base de données
$.post('/deletePatient', { patientName: patientName })
 .done(function(response) {
     // Supprimer la ligne de la table après la suppression réussie du patient
     row.remove();
     console.log('Patient supprimé avec succès');

     // Rafraîchir la liste des patients après la suppression
     refreshPatientList();
 })
 .fail(function(jqXHR, textStatus, errorThrown) {
     console.error('Erreur lors de la suppression du patient :', errorThrown);
     // Gérer l'erreur
 });
});

// Rafraîchir la liste des patients au chargement initial de la page
refreshPatientList();
