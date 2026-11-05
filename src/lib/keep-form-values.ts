import { startTransition, type FormEvent } from "react";

/**
 * onSubmit qui envoie le formulaire à son action sans que React le vide ensuite.
 *
 * Avec <form action={fn}>, React réinitialise les champs non contrôlés dès que l'action
 * se termine, même si elle renvoie une erreur : l'étudiant perdait sa saisie. En appelant
 * l'action nous-mêmes, rien n'est effacé ; c'est au formulaire de se vider en cas de succès.
 * L'attribut action reste en place pour l'envoi sans JavaScript.
 */
export function submitKeepingValues(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => action(formData));
  };
}
