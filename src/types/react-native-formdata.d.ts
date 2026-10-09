// No React Native, FormData aceita um arquivo local no formato { uri, name, type }.
// Os tipos padrão (DOM) só conhecem string | Blob, então adicionamos essa sobrecarga.
export {};

declare global {
  interface FormData {
    append(name: string, value: { uri: string; name: string; type: string }): void;
  }
}
