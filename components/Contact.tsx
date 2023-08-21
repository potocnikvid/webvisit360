import axios from "axios";
import { useForm, SubmitHandler } from "react-hook-form";

type FormInputs = {
  email: string;
  message: string;
};

export function Contact() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitted },
  } = useForm<FormInputs>({
    shouldUseNativeValidation: true,
  });
  const onSubmit: SubmitHandler<FormInputs> = (data) => {
    const params = { email: data.email, message: data.message };
    axios.post("/api/send-email", params).then((res) => console.log(res));
  };
  return (
    <section className="mx-auto flex h-screen w-full max-w-screen-md flex-col gap-5 p-10">
      <h2 className="w-full text-center text-4xl font-bold text-stone-50">
        Contact Us
      </h2>
      <form className="flex flex-col gap-2" onSubmit={handleSubmit(onSubmit)}>
        <input
          type="email"
          className="rounded p-2"
          placeholder="email"
          {...register("email")}
        />
        <textarea
          className="rounded p-2 text-start"
          rows={5}
          placeholder="message"
          {...register("message")}
        />

        <button
          className="rounded bg-stone-800 p-2 text-stone-50"
          type="submit"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-6 w-6 -rotate-90 text-white md:h-8 md:w-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
      </form>
    </section>
  );
}
