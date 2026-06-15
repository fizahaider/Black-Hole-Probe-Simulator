import numpy as np


class NeuralNetwork:
    def __init__(self, input_size=7, hidden_size=10, output_size=3, weights1=None, bias1=None, weights2=None, bias2=None):
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size

        # Xavier init
        if weights1 is None:
            self.w1 = np.random.randn(input_size, hidden_size) * np.sqrt(2.0 / input_size)
        else:
            self.w1 = np.copy(weights1)

        if bias1 is None:
            self.b1 = np.zeros((1, hidden_size))
        else:
            self.b1 = np.copy(bias1)

        if weights2 is None:
            self.w2 = np.random.randn(hidden_size, output_size) * np.sqrt(2.0 / hidden_size)
        else:
            self.w2 = np.copy(weights2)

        if bias2 is None:
            self.b2 = np.zeros((1, output_size))
        else:
            self.b2 = np.copy(bias2)

        # Saved for dashboard rendering
        self.last_inputs = np.zeros((1, input_size))
        self.last_hidden = np.zeros((1, hidden_size))
        self.last_outputs = np.zeros((1, output_size))

    def forward(self, inputs):
        inputs = np.array(inputs).reshape(1, -1)
        self.last_inputs = inputs

        net1 = np.dot(inputs, self.w1) + self.b1
        self.last_hidden = np.tanh(net1)

        net2 = np.dot(self.last_hidden, self.w2) + self.b2
        self.last_outputs = np.tanh(net2)

        return self.last_outputs[0]

    def mutate(self, rate=0.1, amount=0.15):
        mask_w1 = np.random.rand(*self.w1.shape) < rate
        self.w1 += mask_w1 * np.random.randn(*self.w1.shape) * amount

        mask_b1 = np.random.rand(*self.b1.shape) < rate
        self.b1 += mask_b1 * np.random.randn(*self.b1.shape) * amount

        mask_w2 = np.random.rand(*self.w2.shape) < rate
        self.w2 += mask_w2 * np.random.randn(*self.w2.shape) * amount

        mask_b2 = np.random.rand(*self.b2.shape) < rate
        self.b2 += mask_b2 * np.random.randn(*self.b2.shape) * amount

    def clone(self):
        return NeuralNetwork(
            input_size=self.input_size,
            hidden_size=self.hidden_size,
            output_size=self.output_size,
            weights1=self.w1,
            bias1=self.b1,
            weights2=self.w2,
            bias2=self.b2
        )


def crossover(parent1, parent2):
    child = parent1.clone()

    mask_w1 = np.random.rand(*parent1.w1.shape) > 0.5
    child.w1[mask_w1] = parent2.w1[mask_w1]

    mask_b1 = np.random.rand(*parent1.b1.shape) > 0.5
    child.b1[mask_b1] = parent2.b1[mask_b1]

    mask_w2 = np.random.rand(*parent1.w2.shape) > 0.5
    child.w2[mask_w2] = parent2.w2[mask_w2]

    mask_b2 = np.random.rand(*parent1.b2.shape) > 0.5
    child.b2[mask_b2] = parent2.b2[mask_b2]

    return child
