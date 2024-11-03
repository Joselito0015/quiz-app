import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeftCircle, ArrowRightCircle, Users } from "lucide-react";
const { ipcRenderer } = window.require("electron");
import questions from "./questions.json";

const QuizApp = () => {
	const [currentQuestionId, setCurrentQuestionId] = useState("1");
	const [playersLeft, setPlayersLeft] = useState(0);
	const [playersRight, setPlayersRight] = useState(0);
	const [showResults, setShowResults] = useState(false);

	// Escuchar actualizaciones de la base de datos
	useEffect(() => {
		const handleCounts = (event, data) => {
			setPlayersLeft(data.leftPlayers);
			setPlayersRight(data.rightPlayers);
		};

		ipcRenderer.on("player-counts", handleCounts);

		return () => {
			ipcRenderer.removeListener("player-counts", handleCounts);
		};
	}, []);

	const currentQuestion = questions.find(
		(q) => q.pregunta_id === currentQuestionId
	);

	const handleVoteComplete = () => {
		const winner =
			playersLeft > playersRight
				? currentQuestion.opcionIzquierda
				: currentQuestion.opcionDerecha;

		setShowResults(true);

		setTimeout(() => {
			if (winner.siguiente_pregunta_id) {
				setCurrentQuestionId(winner.siguiente_pregunta_id);
				setShowResults(false);
				setPlayersLeft(0);
				setPlayersRight(0);
			}
		}, 3000);
	};

	if (!currentQuestion) {
		return (
			<div className="flex items-center justify-center w-full h-full bg-purple-100">
				<div className="text-center p-6 md:p-8 bg-white rounded-lg shadow-xl">
					<h1 className="text-2xl md:text-4xl font-bold text-purple-600 mb-2 md:mb-4">
						¡Gracias por jugar!
					</h1>
					<p className="text-lg md:text-xl text-gray-600">
						Has completado todas las preguntas
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full w-full bg-gradient-to-b from-blue-100 to-purple-100">
			{/* Pregunta Principal */}
			<div className="flex-shrink-0 p-4 md:p-6">
				<h1 className="text-lg md:text-3xl font-bold text-purple-800 mb-2 md:mb-4 text-center">
					{currentQuestion.texto}
				</h1>
				<img
					src={currentQuestion.imagen}
					alt="Pregunta"
					className="rounded-lg shadow-xl mx-auto w-full max-w-md object-contain"
					style={{ maxHeight: "30vh" }} // Controla la altura de la imagen
				/>
			</div>

			{/* Área de Juego */}
			<div className="flex flex-1 justify-between items-center p-2 md:p-4 space-x-2">
				{/* Zona Izquierda */}
				<motion.div
					className="flex-1 flex flex-col items-center justify-center bg-blue-500 bg-opacity-20 rounded-lg p-2"
					animate={{
						backgroundColor:
							showResults && playersLeft > playersRight ? "#4ade80" : undefined,
					}}>
					<ArrowLeftCircle className="w-8 h-8 md:w-16 md:h-16 text-blue-600 mb-2" />
					<h2 className="text-base md:text-xl font-bold text-blue-800 mb-2 text-center">
						{currentQuestion.opcionIzquierda.texto}
					</h2>
					<div className="flex items-center space-x-2">
						<Users className="w-5 h-5 text-blue-600" />
						<span className="text-lg md:text-xl font-bold text-blue-800">
							{playersLeft}
						</span>
					</div>
				</motion.div>

				{/* Zona Derecha */}
				<motion.div
					className="flex-1 flex flex-col items-center justify-center bg-red-500 bg-opacity-20 rounded-lg p-2"
					animate={{
						backgroundColor:
							showResults && playersRight > playersLeft ? "#4ade80" : undefined,
					}}>
					<ArrowRightCircle className="w-8 h-8 md:w-16 md:h-16 text-red-600 mb-2" />
					<h2 className="text-base md:text-xl font-bold text-red-800 mb-2 text-center">
						{currentQuestion.opcionDerecha.texto}
					</h2>
					<div className="flex items-center space-x-2">
						<Users className="w-5 h-5 text-red-600" />
						<span className="text-lg md:text-xl font-bold text-red-800">
							{playersRight}
						</span>
					</div>
				</motion.div>
			</div>

			{/* Instrucciones y Botón */}
			<div className="flex-shrink-0 p-4 text-center">
				<p className="text-sm md:text-lg text-gray-700">
					¡Muévete a la izquierda o derecha para elegir tu respuesta!
				</p>
				<button
					onClick={handleVoteComplete}
					className="mt-2 bg-purple-600 text-white px-4 py-2 rounded-full text-sm md:text-lg font-bold hover:bg-purple-700">
					Finalizar Votación
				</button>
			</div>

			{/* Indicador de Progreso */}
			<div className="flex justify-center gap-2 p-2">
				{questions.map((q) => (
					<div
						key={q.pregunta_id}
						className={`w-2 h-2 rounded-full ${
							q.pregunta_id === currentQuestionId
								? "bg-purple-600"
								: "bg-purple-200"
						}`}
					/>
				))}
			</div>
		</div>
	);
};

export default QuizApp;
